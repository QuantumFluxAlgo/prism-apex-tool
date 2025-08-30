export type Candle = {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};
export type Suggestion = {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  target: number;
  qty?: number;
  timestampUtc: string;
  meta: {
    strategy: 'VWAP_FT' | 'OSB';
    rr: number;
    notes?: string;
    guardrails?: string[];
    sizingHintPctOfMax?: number;
  };
};
//# sourceMappingURL=types.d.ts.map
