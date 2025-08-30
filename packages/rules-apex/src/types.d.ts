export type AccountPhase = 'eval' | 'funded';
export type Suggestion = {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop?: number;
  qty: number;
  strategy: 'VWAP_FT' | 'OSB';
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
    strategy: 'VWAP_FT' | 'OSB';
    rr: number;
    guardrails: string[];
    sizingHint?: string;
    consistencyNotes?: string;
  };
  target: number;
};
//# sourceMappingURL=types.d.ts.map
