import { getConfig } from '../config/env.js';
import {
  applyGuardWithSizing,
  type Suggestion,
  type GuardContext,
  type StrategyId,
  type AccountPhase,
} from '@prism-apex/rules-apex';
import { Accounts } from './accounts.js';
import { getRecentTicketSizes } from '../store/tickets.js';
import { getAccount as getTelemetryAccount } from '../store/telemetry.js';

const SUPPRESS_MIN_BEFORE = 5; // suppress tickets in final minutes before flat window

export type GuardCandidate = {
  symbol: string;
  contract?: string;
  direction: 'BUY' | 'SELL' | 'long' | 'short';
  entry: number;
  stop?: number;
  target?: number;
  qty?: number;
  strategy?: string;
  accountId?: string;
  phase?: AccountPhase;
  bufferCleared?: boolean;
  recentSizes?: number[];
  maxContracts?: number;
};

export type GuardDecisionDto = {
  allowed: boolean;
  codes: string[];
  warnings: string[];
  reason: string | null;
  sizing: {
    contracts: number;
    rationale: string | null;
  } | null;
};

function normalizeSide(direction: GuardCandidate['direction']): 'BUY' | 'SELL' {
  if (direction === 'SELL' || direction === 'short') return 'SELL';
  return 'BUY';
}

function normalizeStrategy(strategy?: string): StrategyId {
  if (!strategy) return 'APX-DDB-01';
  const key = strategy.toUpperCase();
  if (key.includes('VWAP')) return 'VWAP_FT';
  if (key.includes('OSB')) return 'OSB';
  return 'APX-DDB-01';
}

function withinSuppressionWindow(now: Date, flatByUtc: string, minutes: number): boolean {
  const [h, m] = flatByUtc.split(':').map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
  const flat = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    h,
    m,
    0,
    0,
  );
  const diffMs = flat - now.getTime();
  return diffMs <= minutes * 60_000 && diffMs >= 0;
}

function blockedDecision(reason: string): GuardDecisionDto {
  return {
    allowed: false,
    codes: [reason],
    warnings: [],
    reason,
    sizing: null,
  };
}

function toSuggestion(candidate: GuardCandidate): Suggestion {
  return {
    symbol: candidate.symbol,
    side: normalizeSide(candidate.direction),
    entry: candidate.entry,
    stop: candidate.stop,
    qty: candidate.qty ?? 1,
    strategy: normalizeStrategy(candidate.strategy),
    target: candidate.target,
  };
}

function toContext(candidate: GuardCandidate, now: Date): GuardContext {
  const defaultAccountId = candidate.accountId ?? 'SIM';
  const account = candidate.accountId ? Accounts.get(candidate.accountId) : undefined;
  const telemetry = candidate.accountId ? getTelemetryAccount(candidate.accountId) : undefined;
  const phase: AccountPhase = candidate.phase ?? (account?.mode === 'funded' ? 'funded' : 'eval');
  const maxContracts = Math.max(
    candidate.maxContracts ?? account?.planMaxContracts ?? account?.baseSize ?? 1,
    1,
  );
  const bufferCleared =
    candidate.bufferCleared ?? telemetry?.bufferCleared ?? true;
  const recentSizes =
    candidate.recentSizes ?? (candidate.accountId ? getRecentTicketSizes(candidate.accountId) : []);
  return {
    phase,
    account: { id: defaultAccountId, maxContracts },
    bufferCleared,
    recentSizes,
    contract: candidate.contract ?? candidate.symbol,
    now,
  };
}

export async function evaluateCandidate(
  candidate: GuardCandidate,
  now = new Date(),
): Promise<GuardDecisionDto> {
  const cfg = getConfig();
  if (withinSuppressionWindow(now, cfg.time.flatByUtc, SUPPRESS_MIN_BEFORE)) {
    return blockedDecision('pre-close suppression window');
  }
  if (!candidate.target) {
    return blockedDecision('missing-target');
  }

  const suggestion = toSuggestion(candidate);
  const context = toContext(candidate, now);
  const result = applyGuardWithSizing(suggestion, context);

  if (!result.accepted) {
    const reasons = result.reasons ?? [];
    return {
      allowed: false,
      codes: reasons,
      warnings: [],
      reason: reasons[0] ?? null,
      sizing: null,
    };
  }

  const guardrails = result.ticket?.meta?.guardrails ?? [];
  const sizing = result.ticket
    ? {
        contracts: result.ticket.qty,
        rationale: result.ticket.meta?.sizingHint ?? null,
      }
    : null;
  const warnings = guardrails.filter((code) =>
    code.includes('half-size') || code.includes('stop-optional') || code.includes('anti-windfall'),
  );

  return {
    allowed: true,
    codes: guardrails,
    warnings,
    reason: null,
    sizing,
  };
}
