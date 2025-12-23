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
  const t = guardSuggestion(s, {
    accountId: acct.id,
    phase: acct.phase as 'eval' | 'funded',
    maxContracts: acct.maxContracts,
    bufferCleared: teleAcct?.bufferCleared ?? acct.bufferCleared,
    recentSizes: getRecentTicketSizes(acct.id),
    flatByUtc: cfg.time.flatByUtc,
  });
  if (t.accepted) {
    ticketizer.lastAcceptedTs = t.timestampUtc;
    ticketizer.accepted[t.meta.strategy]++;
  } else {
    ticketizer.rejected[t.meta.strategy]++;
  }
  const canonicalKey = canonicalCandidate?.id ?? null;
  const canonical = canonicalKey ? canonicalCandidateCache.get(canonicalKey) : undefined;
  const sizedCanonical = canonical ? applySizingToCanonical(canonical, t) : undefined;
  const enrichedTicket: Ticket = sizedCanonical
    ? {
        ...t,
        meta: {
          ...t.meta,
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
    : t;
  void saveTicket(enrichedTicket);
  publish('ticket', t);
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
