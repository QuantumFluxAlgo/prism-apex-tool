export interface Bar1m {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export type SessionBoundaryFn = (tsIso: string) => string;
export interface TickSpec {
  tickSize: number;
}
//# sourceMappingURL=types.d.ts.map
