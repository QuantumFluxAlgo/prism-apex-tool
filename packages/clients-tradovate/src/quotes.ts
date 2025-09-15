import { Quote } from './types.js';
import type { TradovateMessage, TradovateQuotePayload } from './ws.js';

export type PublishQuote = (q: Quote) => void;

function safeParseQuote(msg: TradovateMessage): TradovateQuotePayload | null {
  if (typeof msg === 'string') {
    try {
      const parsed = JSON.parse(msg) as unknown;
      return isQuotePayload(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isQuotePayload(msg) ? msg : null;
}

function isQuotePayload(value: unknown): value is TradovateQuotePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'fullSymbol' in value &&
    typeof (value as { fullSymbol: unknown }).fullSymbol === 'string'
  );
}

export class QuoteHandler {
  constructor(private publish: PublishQuote) {}
  onMessage(msg: TradovateMessage) {
    const quote = safeParseQuote(msg);
    if (!quote) return;

    const tsSource = quote.ts;
    const tsValue = tsSource ? Number(tsSource) : Date.now();

    this.publish({
      ts: Number.isFinite(tsValue) ? tsValue : Date.now(),
      last: Number(quote.last),
      bid: quote.bid !== undefined ? Number(quote.bid) : undefined,
      ask: quote.ask !== undefined ? Number(quote.ask) : undefined,
      volume: Number(quote.volume ?? 0),
      fullSymbol: String(quote.fullSymbol),
    });
  }
}
