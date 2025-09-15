declare module '@prism-apex/rules/apex.js' {
  export type OrderParams = {
    qty: number;
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
  };

  export type GuardContext = {
    mode: 'funded' | 'evaluation';
    bufferCleared: boolean;
    maxContractsAllowed: number;
    now?: Date;
    cfg?: unknown;
  };

  export type GuardResult = {
    allow: boolean;
    reason?: string;
    ticket?: OrderParams;
  };

  export function guardApexFundingRules(t: OrderParams, ctx: GuardContext): GuardResult;
}
