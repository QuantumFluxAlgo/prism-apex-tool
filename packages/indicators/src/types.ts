export interface Bar1m {
  ts: string; // ISO timestamp (UTC) of bar close
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SessionBoundaryFn = (tsIso: string) => string;
// Returns a session key (e.g., "2025-08-25-RTH") for the given timestamp.
// When the key changes between bars, indicators should reset session state.

export interface TickSpec {
  tickSize: number; // e.g., 0.25 for ES
}
