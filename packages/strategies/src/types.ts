export type Candle = {
  ts: string; // ISO UTC
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type StrategyId = 'VWAP_FT' | 'OSB' | 'APX-DDB-01';

export type Suggestion = {
  symbol: string; // full contract, e.g., ESZ4
  side: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  target: number;
  qty?: number; // suggested size (optional here)
  timestampUtc: string; // when generated
  meta: {
    strategy: StrategyId;
    rr: number;
    notes?: string;
    guardrails?: string[]; // e.g., ["RR_CLAMPED","MIN_TICKS_BUMP"]
    sizingHintPctOfMax?: number;
  };
};
