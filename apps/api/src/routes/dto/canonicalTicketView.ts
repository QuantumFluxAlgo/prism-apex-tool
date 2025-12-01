/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this API file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this API file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import type { CanonicalCandidateTicket, CanonicalTicket } from '@prism-apex/shared';

export type CanonicalApprovedTicketView = Pick<
  CanonicalTicket,
  | 'symbol'
  | 'sessionDateUtc'
  | 'side'
  | 'entryPrice'
  | 'stopPrice'
  | 'targetPrice'
  | 'stopTicks'
  | 'targetTicks'
  | 'quantity'
  | 'perContractRisk'
  | 'totalRisk'
  | 'expectedReward'
  | 'rrMultiple'
  | 'strategyId'
  | 'strategyVersion'
  | 'contextRegime'
  | 'contextAtrBucket'
  | 'contextOrType'
  | 'tags'
  | 'createdAtUtc'
  | 'source'
> & {
  ticketId: string;
  status: string | null;
  finalizedAtUtc: string | null;
  pnl?: number | null;
  pnlRMultiple?: number | null;
};

type PersistedTicket = Record<string, unknown> & {
  id?: string;
  status?: string;
  timestampUtc?: string;
  completed_at_utc?: string | null;
  pnl?: number | null;
  pnl_amount?: number | null;
  pnl_ratio?: number | null;
  meta?: Record<string, unknown> & { canonicalCandidate?: CanonicalCandidateTicket };
  qty?: number;
  entry?: number;
  stop?: number;
  target?: number;
  symbol?: string;
  strategy?: string;
  direction?: string;
};

export function buildCanonicalApprovedTicketView(
  row: PersistedTicket,
): CanonicalApprovedTicketView | null {
  const candidate = row.meta?.canonicalCandidate;
  if (!candidate) {
    return null;
  }

  const status = typeof row.status === 'string' ? row.status : null;
  const finalizedAtUtc = (row.completed_at_utc as string | null) ?? null;
  const pnl = (row.pnl as number | null) ?? (row.pnl_amount as number | null) ?? null;
  const pnlRMultiple = (row.pnl_ratio as number | null) ?? null;

  return {
    ticketId: String(row.id ?? candidate.id),
    symbol: candidate.symbol,
    sessionDateUtc: candidate.sessionDateUtc,
    side: candidate.side,
    entryPrice: candidate.entryPrice,
    stopPrice: candidate.stopPrice,
    targetPrice: candidate.targetPrice,
    stopTicks: candidate.stopTicks,
    targetTicks: candidate.targetTicks,
    quantity: candidate.quantity,
    perContractRisk: candidate.perContractRisk,
    totalRisk: candidate.totalRisk,
    expectedReward: candidate.expectedReward,
    rrMultiple: candidate.rrMultiple,
    strategyId: candidate.strategyId,
    strategyVersion: candidate.strategyVersion ?? null,
    contextRegime: candidate.contextRegime ?? null,
    contextAtrBucket: candidate.contextAtrBucket ?? null,
    contextOrType: candidate.contextOrType ?? null,
    tags: candidate.tags ?? null,
    createdAtUtc: candidate.createdAtUtc,
    source: candidate.source ?? 'ENGINE',
    status,
    finalizedAtUtc,
    pnl,
    pnlRMultiple,
  };
}
