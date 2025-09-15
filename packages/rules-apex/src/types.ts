export type AccountPhase = 'eval' | 'funded';

export type StrategyId = 'VWAP_FT' | 'OSB' | 'APX-DDB-01';

export type Suggestion = {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop?: number;
  qty: number;
  strategy: StrategyId;
  target?: number;
};

export type Ticket = {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  qty: number;
  accountId: string;
  timestampUtc: string;
  meta: {
    strategy: StrategyId;
    rr: number;
    guardrails: string[];
    sizingHint?: string;
    consistencyNotes?: string;
  };
  target: number;
};
