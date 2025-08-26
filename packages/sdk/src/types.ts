export type Side = 'BUY' | 'SELL';
export type Bar = {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};
export type Suggestion = {
  id: string;
  symbol: string;
  side: Side;
  qty: number;
  entry: number;
  stop: number;
  targets: number[];
  apex_blocked?: boolean;
  reasons: string[];
  meta?: Record<string, unknown>;
};
export type SuggestionResult = { suggestions: Suggestion[] };
export type SymbolsResponse = { symbols: string[] };
export type SessionsResponse = {
  RTH: { start: string; end: string; tz: string };
  ETH: { start: string; end: string; tz: string };
};
export type OSBInput = { symbol: string; session: 'RTH' | 'ETH'; bars: Bar[] };
export type VWAPInput = { symbol: string; bars: Bar[] };
