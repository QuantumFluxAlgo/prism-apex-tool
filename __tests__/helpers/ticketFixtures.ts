/**
 * Canonical ticket fixtures matching docs and operator flow.
 * Keeps tests consistent with the tickets-only contract.
 */

export type StrategyId = 'vwap-first-touch' | 'osb-breakout' | (string & {});
export type Side = 'BUY' | 'SELL';

export interface TicketMeta {
  strategy: StrategyId;
  rr?: number;
  guardrails?: string[];
  sizingHint?: 'half-size' | 'normal' | 'reduced' | (string & {});
  consistencyNotes?: string;
}

export interface Ticket {
  symbol: string;
  side: Side;
  entry: number;
  stop: number;
  target: number;
  qty: number;
  accountId: string;
  timestampUtc: string;
  meta?: TicketMeta;
  accepted: boolean;
  reasons?: string[];
}

export const ticketFactory = (overrides: Partial<Ticket> = {}): Ticket => {
  const base: Ticket = {
    symbol: 'MESZ5',
    side: 'BUY',
    entry: 5550.25,
    stop: 5544.25,
    target: 5560.25,
    qty: 1,
    accountId: 'APEX-TEST',
    timestampUtc: new Date(Date.UTC(2025, 0, 1, 12, 0, 0)).toISOString(),
    meta: {
      strategy: 'vwap-first-touch',
      rr: 1.5,
      guardrails: ['stopSideOk', 'rrInRange'],
      sizingHint: 'normal',
      consistencyNotes: 'fixture',
    },
    accepted: true,
    reasons: [],
  };
  return { ...base, ...overrides };
};
