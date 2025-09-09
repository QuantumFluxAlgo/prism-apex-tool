/**
 * Ambient canonical contracts for Prism-Apex (tickets-only architecture).
 * Non-breaking typings merged globally; no runtime changes.
 */
declare namespace PrismApex {
  type StrategyId = 'vwap-first-touch' | 'osb-breakout' | (string & {});
  type Side = 'BUY' | 'SELL';
  type GuardrailReason =
    | 'STOP_REQUIRED'
    | 'STOP_SIDE_INVALID'
    | 'RR_OUT_OF_RANGE'
    | 'SIZE_CLAMPED'
    | 'TRAILING_DRAWDOWN'
    | 'EOD_WINDOW'
    | 'OUT_OF_HOURS'
    | 'CONFIG_DISABLED'
    | 'DUPLICATE_SIGNAL'
    | 'SYMBOL_INVALID'
    | (string & {});
  interface TicketMeta {
    strategy: StrategyId;
    rr?: number;
    guardrails?: string[];
    sizingHint?: 'half-size' | 'normal' | 'reduced' | (string & {});
    consistencyNotes?: string;
  }
  interface Ticket {
    symbol: string;
    side: Side;
    entry: number;
    stop: number;
    target: number;
    qty: number;
    accountId: string;
    timestampUtc: string; // ISO8601
    meta?: TicketMeta;
    accepted: boolean;
    reasons?: GuardrailReason[] | string[];
  }
}
// Convenience aliases (optional)
type ApexTicket = PrismApex.Ticket;
type ApexTicketMeta = PrismApex.TicketMeta;
type ApexStrategyId = PrismApex.StrategyId;
type ApexGuardrailReason = PrismApex.GuardrailReason;
