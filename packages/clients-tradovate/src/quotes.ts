import { Quote } from './types.js';

export type PublishQuote = (q: Quote) => void;

export class QuoteHandler {
  constructor(private publish: PublishQuote) {}
  onMessage(msg: any) {
    const q = typeof msg === 'string' ? JSON.parse(msg) : msg;
    if (q && q.fullSymbol) {
      this.publish({
        ts: Number(q.ts || Date.now()),
        last: Number(q.last),
        bid: q.bid !== undefined ? Number(q.bid) : undefined,
        ask: q.ask !== undefined ? Number(q.ask) : undefined,
        volume: Number(q.volume || 0),
        fullSymbol: String(q.fullSymbol),
      });
    }
  }
}
