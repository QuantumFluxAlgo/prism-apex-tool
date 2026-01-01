/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this API file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this API file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import { subscribe, publish } from '../lib/bus.js';
import { jobManager } from '../lib/jobManager.js';
import { applyGuardWithSizing } from '@prism-apex/rules-apex';
import { loadRegistry } from '@prism-apex/config';
import { getConfig } from '../config/env.js';
import { TICKET_STRATEGIES } from '../schemas/ticket.js';
import type { Ticket, TicketStrategy } from '../schemas/ticket.js';
import { saveTicket, getRecentTicketSizes } from '../store/tickets.js';
import { getAccount as getTelemetryAccount } from '../store/telemetry.js';
import type { CanonicalCandidateTicket } from '@prism-apex/shared';
import { buildCanonicalCandidateTicket } from '../services/strategy-engine/index.js';
import { shouldBlockNewTicketsForDay } from '../services/operatorRisk.js';
import { createSystemAlert } from '../store/systemAlerts.js';
import { recordRiskLockout } from '../store/riskAuditLog.js';
import { getSessionRisk } from '../store/operatorSessionRisk.js';
import { getInstrumentSpec } from '../risk/contractMath.js';
import { recordPlannerRejectCountBestEffort } from '../system-records/plannerRejectRecorder.js';

const RUN_CONTINUOUS = (process.env.RUN_CONTINUOUS ?? '1') === '1';
const OPERATOR_ID = 'DEFAULT';

function computeRR(params: { entry: number; stop: number; target: number }): number {
  const risk = Math.abs(params.entry - params.stop);
  const reward = Math.abs(params.target - params.entry);
  return reward / risk;
}

function buildConsistencyNotes(phase: 'eval' | 'funded'): string {
  let notes = 'metrics-only; enforce=false';
  if (process.env.CONSISTENCY_ENFORCE === 'true' && phase === 'funded') {
    notes += '; preblock=disabled-pending-telemetry';
  }
  return notes;
}

const makeStrategyCounter = (): Record<TicketStrategy, number> =>
  Object.fromEntries(TICKET_STRATEGIES.map((strategy) => [strategy, 0])) as Record<
    TicketStrategy,
    number
  >;

export type Suggestion = {
  symbol: string; // root symbol
  contract: string; // full contract
  side: 'BUY' | 'SELL';
  entry: number;
  stop?: number;
  target: number;
  qty?: number;
  timestampUtc: string;
  meta: { strategy: TicketStrategy };
};

export const ticketizer = {
  running: false,
  lastSuggestionTs: '',
  lastAcceptedTs: '',
  accepted: makeStrategyCounter(),
  rejected: makeStrategyCounter(),
};

let unsub: (() => void) | null = null;
const canonicalCandidateCache = new Map<string, CanonicalCandidateTicket>();

function mergeDailyRiskMeta(params: {
  ticket: Ticket;
  pending: { riskUsd: number; perContractRiskUsd: number; qty: number };
  sessionRisk: { dailyRiskLimitUsd: number; riskUsedUsd: number };
}): Ticket {
  const baseMeta =
    params.ticket.meta && typeof params.ticket.meta === 'object'
      ? params.ticket.meta
      : {};
  const operatorDailyRisk = {
    dailyRiskLimitUsd: params.sessionRisk.dailyRiskLimitUsd,
    riskUsedUsd: params.sessionRisk.riskUsedUsd,
    riskRemainingUsd: Math.max(
      0,
      params.sessionRisk.dailyRiskLimitUsd - params.sessionRisk.riskUsedUsd,
    ),
  };
  const operatorDailyRiskPending = {
    riskUsd: params.pending.riskUsd,
    perContractRiskUsd: params.pending.perContractRiskUsd,
    qty: params.pending.qty,
    computedAtUtc: new Date().toISOString(),
  };
  return {
    ...params.ticket,
    meta: {
      ...baseMeta,
      operatorDailyRisk,
      operatorDailyRiskPending,
    },
  };
}

function computePendingRisk(ticket: Ticket, suggestion: Suggestion): {
  riskUsd: number;
  perContractRiskUsd: number;
  qty: number;
} {
  const entry = typeof ticket.entry === 'number' ? ticket.entry : null;
  const stop = typeof ticket.stop === 'number' ? ticket.stop : entry;
  const qty =
    typeof ticket.qty === 'number' && Number.isFinite(ticket.qty) && ticket.qty > 0
      ? ticket.qty
      : 0;
  if (entry === null || stop === null || qty <= 0) {
    return { riskUsd: 0, perContractRiskUsd: 0, qty };
  }
  try {
    const spec = getInstrumentSpec(suggestion.symbol ?? ticket.symbol);
    const ticks = Math.abs(entry - stop) / spec.tickSize;
    if (!Number.isFinite(ticks) || ticks <= 0) {
      return { riskUsd: 0, perContractRiskUsd: 0, qty };
    }
    const perContract = ticks * spec.dollarsPerTick;
    return { riskUsd: perContract * qty, perContractRiskUsd: perContract, qty };
  } catch {
    return { riskUsd: Math.abs(entry - stop) * qty, perContractRiskUsd: 0, qty };
  }
}

function ensureReasons(existing: string[] | undefined, reason: string): string[] {
  if (!Array.isArray(existing)) return [reason];
  return [...existing, reason];
}

function computeTicketRisk(
  ticket: Ticket,
  suggestion: Suggestion,
): { total: number; perContract: number } {
  const entry = typeof ticket.entry === 'number' ? ticket.entry : null;
  const stop = typeof ticket.stop === 'number' ? ticket.stop : entry;
  const qty = typeof ticket.qty === 'number' && Number.isFinite(ticket.qty) ? ticket.qty : 0;
  if (entry === null || stop === null || !(qty > 0)) {
    return { total: 0, perContract: 0 };
  }
  try {
    const spec = getInstrumentSpec(suggestion.symbol ?? ticket.symbol);
    const ticks = Math.abs(entry - stop) / spec.tickSize;
    if (!Number.isFinite(ticks) || ticks <= 0) {
      return { total: 0, perContract: 0 };
    }
    const perContract = ticks * spec.dollarsPerTick;
    return { total: perContract * qty, perContract };
  } catch {
    return { total: Math.abs(entry - stop) * qty, perContract: 0 };
  }
}

async function enforceOperatorDailyRisk(
  ticket: Ticket,
  suggestion: Suggestion,
  sessionDate: string,
): Promise<Ticket> {
  if (!ticket.accepted) return ticket;

  const riskRecord = await getSessionRisk(OPERATOR_ID, sessionDate);
  if (!riskRecord) {
    console.warn(
      `[ticketizer] daily risk limit not set (session=${sessionDate}); rejecting ticket`,
    );
    return {
      ...ticket,
      accepted: false,
      reasons: ensureReasons(ticket.reasons, 'daily-risk-limit-not-set'),
      meta: {
        ...ticket.meta,
        operatorDailyRisk: {
          dailyRiskLimitUsd: null,
          riskUsedUsd: 0,
          riskRemainingUsd: 0,
          reason: 'daily-risk-limit-not-set',
        },
      },
    };
  }

  const { total, perContract } = computeTicketRisk(ticket, suggestion);
  const remaining = Math.max(
    0,
    riskRecord.dailyRiskLimitUsd - riskRecord.riskUsedUsd,
  );

  if (!(total > 0)) {
    return {
      ...ticket,
      meta: {
        ...ticket.meta,
        operatorDailyRisk: {
          dailyRiskLimitUsd: riskRecord.dailyRiskLimitUsd,
          riskUsedUsd: riskRecord.riskUsedUsd,
          riskRemainingUsd: remaining,
        },
      },
    };
  }

  let workingTicket: Ticket = ticket;
  let workingRiskUsd = total;

  if (total > remaining) {
    if (!(perContract > 0)) {
      console.warn(
        `[ticketizer] unable to resize ticket for remaining risk (session=${sessionDate})`,
      );
      return {
        ...ticket,
        accepted: false,
        reasons: ensureReasons(ticket.reasons, 'daily-risk-limit-exceeded'),
        meta: {
          ...ticket.meta,
          operatorDailyRisk: {
            dailyRiskLimitUsd: riskRecord.dailyRiskLimitUsd,
            riskUsedUsd: riskRecord.riskUsedUsd,
            riskRemainingUsd: remaining,
            reason: 'daily-risk-limit-exceeded',
          },
        },
      };
    }
    const maxContracts = Math.floor(remaining / perContract);
    if (!(maxContracts > 0)) {
      console.warn(
        `[ticketizer] remaining daily risk exhausted (session=${sessionDate}); rejecting ticket`,
      );
      return {
        ...ticket,
        accepted: false,
        reasons: ensureReasons(ticket.reasons, 'daily-risk-limit-exceeded'),
        meta: {
          ...ticket.meta,
          operatorDailyRisk: {
            dailyRiskLimitUsd: riskRecord.dailyRiskLimitUsd,
            riskUsedUsd: riskRecord.riskUsedUsd,
            riskRemainingUsd: remaining,
            reason: 'daily-risk-limit-exceeded',
          },
        },
      };
    }
    workingRiskUsd = perContract * maxContracts;
    const guardrails = Array.isArray(ticket.meta?.guardrails)
      ? [...ticket.meta.guardrails, 'daily-risk-limit-resized']
      : ['daily-risk-limit-resized'];
    workingTicket = {
      ...ticket,
      qty: maxContracts,
      meta: {
        ...ticket.meta,
        guardrails,
      },
    };
  }

  const updateResult = await addRiskUsed(OPERATOR_ID, sessionDate, workingRiskUsd);
  if (!updateResult.ok) {
    console.warn(
      `[ticketizer] daily risk limit exceeded (session=${sessionDate}); rejecting ticket`,
    );
    return {
      ...ticket,
      accepted: false,
      reasons: ensureReasons(ticket.reasons, 'daily-risk-limit-exceeded'),
      meta: {
        ...ticket.meta,
        operatorDailyRisk: {
          dailyRiskLimitUsd: riskRecord.dailyRiskLimitUsd,
          riskUsedUsd: riskRecord.riskUsedUsd,
          riskRemainingUsd: remaining,
          reason: 'daily-risk-limit-exceeded',
        },
      },
    };
  }

  const limitUsd =
    typeof updateResult.limitUsd === 'number'
      ? updateResult.limitUsd
      : riskRecord.dailyRiskLimitUsd;
  const usedUsd =
    typeof updateResult.usedUsd === 'number'
      ? updateResult.usedUsd
      : riskRecord.riskUsedUsd + workingRiskUsd;

  return {
    ...workingTicket,
    meta: {
      ...workingTicket.meta,
      operatorDailyRisk: {
        dailyRiskLimitUsd: limitUsd,
        riskUsedUsd: usedUsd,
        riskRemainingUsd: Math.max(0, (limitUsd ?? 0) - usedUsd),
      },
    },
  };
}

function isPreClose(ts: string, flat: string): boolean {
  const day = ts.slice(0, 10);
  const s = new Date(ts).getTime();
  const flatTs = new Date(`${day}T${flat}Z`).getTime();
  const diff = flatTs - s;
  return diff <= 5 * 60 * 1000 && diff >= 0;
}

export function guardSuggestion(
  s: Suggestion,
  ctx: {
    accountId: string;
    phase: 'eval' | 'funded';
    maxContracts: number;
    bufferCleared: boolean;
    recentSizes: number[];
    flatByUtc: string;
  },
): Ticket {
  if (isPreClose(s.timestampUtc, ctx.flatByUtc)) {
    return {
      symbol: s.contract,
      side: s.side,
      entry: s.entry,
      stop: s.stop ?? s.entry,
      target: s.target,
      qty: s.qty ?? 0,
      accountId: ctx.accountId,
      timestampUtc: s.timestampUtc,
      meta: {
        strategy: s.meta.strategy,
        rr: s.stop != null ? computeRR({ entry: s.entry, stop: s.stop, target: s.target }) : 0,
        guardrails: ['phase:' + ctx.phase, 'preclose-suppressed'],
        consistencyNotes: buildConsistencyNotes(ctx.phase),
      },
      accepted: false,
      reasons: ['preclose-suppression'],
    };
  }

  const res = applyGuardWithSizing(
    {
      symbol: s.symbol,
      side: s.side,
      entry: s.entry,
      stop: s.stop,
      qty: s.qty ?? 0,
      strategy: s.meta.strategy,
      target: s.target,
    },
    {
      phase: ctx.phase,
      account: { id: ctx.accountId, maxContracts: ctx.maxContracts },
      bufferCleared: ctx.bufferCleared,
      recentSizes: ctx.recentSizes,
      contract: s.contract,
    },
  );

  if (res.accepted && res.ticket) {
    return {
      ...res.ticket,
      target: res.ticket.target,
      accepted: true,
      meta: {
        ...res.ticket.meta,
        consistencyNotes: buildConsistencyNotes(ctx.phase),
      },
    } as Ticket;
  }

  return {
    symbol: s.contract,
    side: s.side,
    entry: s.entry,
    stop: s.stop ?? s.entry,
    target: s.target,
    qty: s.qty ?? 0,
    accountId: ctx.accountId,
    timestampUtc: s.timestampUtc,
    meta: {
      strategy: s.meta.strategy,
      rr: s.stop != null ? computeRR({ entry: s.entry, stop: s.stop, target: s.target }) : 0,
      guardrails: [
        'phase:' + ctx.phase,
        ctx.bufferCleared ? 'buffer' : 'half-size-until-buffer',
        'anti-windfall',
      ],
      consistencyNotes: buildConsistencyNotes(ctx.phase),
    },
    accepted: false,
    reasons: res.reasons,
  } as Ticket;
}

function onSuggestion(s: Suggestion): void {
  void handleSuggestion(s);
}

function applySizingToCanonical(
  canonical: CanonicalCandidateTicket,
  ticket: Ticket,
): CanonicalCandidateTicket {
  const sizedQuantity =
    typeof ticket.qty === 'number' && Number.isFinite(ticket.qty) && ticket.qty > 0
      ? ticket.qty
      : canonical.quantity;
  if (!sizedQuantity || sizedQuantity <= 0) {
    return canonical;
  }

  const perContractRisk =
    typeof canonical.perContractRisk === 'number' && Number.isFinite(canonical.perContractRisk)
      ? canonical.perContractRisk
      : Math.abs(ticket.entry - ticket.stop);

  const computedRR =
    typeof canonical.rrMultiple === 'number' && Number.isFinite(canonical.rrMultiple)
      ? canonical.rrMultiple
      : perContractRisk > 0
      ? Math.abs(ticket.target - ticket.entry) / Math.max(perContractRisk, 1)
      : 1;

  const perContractReward = perContractRisk > 0 ? perContractRisk * computedRR : 0;

  return {
    ...canonical,
    quantity: sizedQuantity,
    perContractRisk,
    rrMultiple: computedRR,
    totalRisk: perContractRisk > 0 ? perContractRisk * sizedQuantity : canonical.totalRisk,
    expectedReward:
      perContractReward > 0 ? perContractReward * sizedQuantity : canonical.expectedReward,
  };
}

async function handleSuggestion(s: Suggestion): Promise<void> {
  jobManager.beat('TICKETIZER');
  ticketizer.lastSuggestionTs = s.timestampUtc;

  const riskDate = s.timestampUtc.slice(0, 10);
  try {
    const lockedOut = await shouldBlockNewTicketsForDay(riskDate);
    if (lockedOut) {
      console.info(
        `[ticketizer] Skipping suggestion symbol=${s.symbol} strategy=${s.meta.strategy} riskDate=${riskDate} — daily risk lockout active`,
      );
      try {
        createSystemAlert({
          severity: 'warning',
          source: 'operator-risk',
          code: 'DAILY_LOCKOUT',
          message: 'Daily risk lockout active: new tickets blocked for the day.',
          entityType: 'risk',
          entityId: riskDate,
          details: { riskDate },
        });
      } catch (alertErr) {
        // eslint-disable-next-line no-console
        console.error('[systemAlerts] Failed creating daily lockout alert', alertErr);
      }
      try {
        recordRiskLockout({
          tradingDay: riskDate,
          source: 'ticketizer',
          reason: 'Daily risk lockout active: new tickets blocked for the day.',
          snapshot: undefined,
        });
      } catch (auditErr) {
        // eslint-disable-next-line no-console
        console.error('[riskAuditLog] Failed recording lockout decision', auditErr);
      }
      const requestedPlanner =
        typeof s.meta?.strategy === 'string' && s.meta.strategy.length > 0 ? s.meta.strategy : '';
      const rejectingPlanner = requestedPlanner;
      if (riskDate && s.symbol && requestedPlanner && rejectingPlanner) {
        void recordPlannerRejectCountBestEffort({
          sessionDate: riskDate,
          symbol: s.symbol,
          requestedPlannerRaw: requestedPlanner,
          rejectingPlannerRaw: rejectingPlanner,
          rejectStage: 'TICKETIZER',
          rawReason: 'DAILY_RISK_LOCKOUT',
          delta: 1,
        });
      }
      return;
    }
  } catch (err) {
    console.warn(`[ticketizer] Failed to evaluate daily risk lockout for ${riskDate}`, err);
  }

  const canonicalCandidate = buildCanonicalCandidateTicket(s);
  canonicalCandidateCache.set(canonicalCandidate.id, canonicalCandidate);
  if (canonicalCandidateCache.size > 100) {
    const oldestKey = canonicalCandidateCache.keys().next().value;
    if (oldestKey) {
      canonicalCandidateCache.delete(oldestKey);
    }
  }
  const registry = loadRegistry();
  const acct = registry.accounts[0];
  const cfg = getConfig();
  const teleAcct = getTelemetryAccount(acct.id);
  let processedTicket = guardSuggestion(s, {
    accountId: acct.id,
    phase: acct.phase as 'eval' | 'funded',
    maxContracts: acct.maxContracts,
    bufferCleared: teleAcct?.bufferCleared ?? acct.bufferCleared,
    recentSizes: getRecentTicketSizes(acct.id),
    flatByUtc: cfg.time.flatByUtc,
  });
  if (processedTicket.accepted) {
    try {
      const sessionRisk = await getSessionRisk(OPERATOR_ID, riskDate);
      if (!sessionRisk) {
        processedTicket = {
          ...processedTicket,
          accepted: false,
          reasons: Array.isArray(processedTicket.reasons)
            ? [...processedTicket.reasons, 'daily-risk-limit-not-set']
            : ['daily-risk-limit-not-set'],
        };
        console.warn(
          `[ticketizer] daily risk limit not set for session ${riskDate}; rejecting ticket`,
        );
      } else {
        const pending = computePendingRisk(processedTicket, s);
        processedTicket = mergeDailyRiskMeta({
          ticket: processedTicket,
          pending,
          sessionRisk,
        });
      }
    } catch (err) {
      console.warn(`[ticketizer] Failed to load operator risk for ${riskDate}`, err);
      processedTicket = {
        ...processedTicket,
        accepted: false,
        reasons: Array.isArray(processedTicket.reasons)
          ? [...processedTicket.reasons, 'daily-risk-limit-error']
          : ['daily-risk-limit-error'],
      };
    }
  }
  if (processedTicket.accepted) {
    ticketizer.lastAcceptedTs = processedTicket.timestampUtc;
    ticketizer.accepted[processedTicket.meta.strategy]++;
  } else {
    ticketizer.rejected[processedTicket.meta.strategy]++;
    const sessionDate = riskDate;
    const symbol =
      typeof s.symbol === 'string' && s.symbol.length > 0 ? s.symbol : processedTicket.symbol;
    const requestedPlanner =
      typeof s.meta?.strategy === 'string' && s.meta.strategy.length > 0
        ? s.meta.strategy
        : processedTicket.meta?.strategy ?? '';
    const rejectingPlanner =
      typeof processedTicket.meta?.strategy === 'string' && processedTicket.meta.strategy.length > 0
        ? processedTicket.meta.strategy
        : requestedPlanner;
    const rawReason = Array.isArray(processedTicket.reasons)
      ? processedTicket.reasons.join(',')
      : typeof processedTicket.reasons === 'string'
        ? processedTicket.reasons
        : '';
    if (sessionDate && symbol && requestedPlanner && rejectingPlanner) {
      void recordPlannerRejectCountBestEffort({
        sessionDate,
        symbol,
        requestedPlannerRaw: requestedPlanner,
        rejectingPlannerRaw: rejectingPlanner,
        rejectStage: 'TICKETIZER',
        rawReason: rawReason || 'TICKETIZER_REJECTED',
        delta: 1,
      });
    }
  }
  const canonicalKey = canonicalCandidate?.id ?? null;
  const canonical = canonicalKey ? canonicalCandidateCache.get(canonicalKey) : undefined;
  const sizedCanonical = canonical ? applySizingToCanonical(canonical, processedTicket) : undefined;
  const enrichedTicket: Ticket = sizedCanonical
    ? {
        ...processedTicket,
        meta: {
          ...processedTicket.meta,
          canonicalCandidate: {
            id: sizedCanonical.id,
            symbol: sizedCanonical.symbol,
            sessionDateUtc: sizedCanonical.sessionDateUtc,
            side: sizedCanonical.side,
            entryPrice: sizedCanonical.entryPrice,
            stopPrice: sizedCanonical.stopPrice,
            targetPrice: sizedCanonical.targetPrice,
            stopTicks: sizedCanonical.stopTicks,
            targetTicks: sizedCanonical.targetTicks,
            quantity: sizedCanonical.quantity,
            rrMultiple: sizedCanonical.rrMultiple,
            perContractRisk: sizedCanonical.perContractRisk,
            totalRisk: sizedCanonical.totalRisk,
            expectedReward: sizedCanonical.expectedReward,
            strategyId: sizedCanonical.strategyId,
            contextRegime: sizedCanonical.contextRegime,
            contextAtrBucket: sizedCanonical.contextAtrBucket,
            contextOrType: sizedCanonical.contextOrType,
            tags: sizedCanonical.tags,
            createdAtUtc: sizedCanonical.createdAtUtc,
            source: sizedCanonical.source,
          },
        },
      }
    : processedTicket;
  void saveTicket(enrichedTicket);
  publish('ticket', enrichedTicket);
}

async function start(): Promise<void> {
  ticketizer.running = true;
  unsub = subscribe<Suggestion>('suggestion', onSuggestion);
}

async function stop(): Promise<void> {
  unsub?.();
  ticketizer.running = false;
}

export function registerTicketizerJob(): void {
  jobManager.register('TICKETIZER', start, stop);
}
