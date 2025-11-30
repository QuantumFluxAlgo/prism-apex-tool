import type { CanonicalTicket } from '@prism-apex/shared';

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
