import { Bar } from './types.js';
export type PublishBar = (bar: Bar) => void;
export declare class BarAggregator {
  private symbol;
  private fullSymbol;
  private session;
  private publish;
  private currentTs;
  private bar;
  constructor(symbol: string, fullSymbol: string, session: 'RTH' | 'ETH', publish: PublishBar);
  onQuote(q: { ts: number; price: number; volume: number }): void;
  flush(): void;
}
//# sourceMappingURL=bars.d.ts.map
