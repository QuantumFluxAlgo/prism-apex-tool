export interface Bar {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  fullSymbol: string;
  session: 'RTH' | 'ETH';
}
export interface Quote {
  ts: number;
  last: number;
  bid?: number;
  ask?: number;
  volume: number;
  fullSymbol: string;
}
export interface ContractMeta {
  fullSymbol: string;
  tickSize: number;
  tickValue: number;
  minTick: number;
  multiplier: number;
}
export declare class TradovateClientError extends Error {
  constructor(message: string);
}
//# sourceMappingURL=types.d.ts.map
