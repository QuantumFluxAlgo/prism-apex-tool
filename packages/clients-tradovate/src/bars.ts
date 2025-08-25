import { Bar } from './types.js';

export type PublishBar = (bar: Bar) => void;

export class BarAggregator {
  private currentTs: number | null = null;
  private bar: Bar | null = null;

  constructor(
    private symbol: string,
    private fullSymbol: string,
    private session: 'RTH' | 'ETH',
    private publish: PublishBar,
  ) {}

  onQuote(q: { ts: number; price: number; volume: number }) {
    const minute = Math.floor(q.ts / 60000) * 60000;
    if (this.currentTs === null || minute !== this.currentTs) {
      if (this.bar) this.publish(this.bar);
      this.currentTs = minute;
      this.bar = {
        ts: minute,
        open: q.price,
        high: q.price,
        low: q.price,
        close: q.price,
        volume: q.volume,
        symbol: this.symbol,
        fullSymbol: this.fullSymbol,
        session: this.session,
      };
    } else if (this.bar) {
      this.bar.high = Math.max(this.bar.high, q.price);
      this.bar.low = Math.min(this.bar.low, q.price);
      this.bar.close = q.price;
      this.bar.volume += q.volume;
    }
  }

  flush() {
    if (this.bar) this.publish(this.bar);
    this.bar = null;
    this.currentTs = null;
  }
}
