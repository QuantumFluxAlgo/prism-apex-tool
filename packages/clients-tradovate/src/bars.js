export class BarAggregator {
  symbol;
  fullSymbol;
  session;
  publish;
  currentTs = null;
  bar = null;
  constructor(symbol, fullSymbol, session, publish) {
    this.symbol = symbol;
    this.fullSymbol = fullSymbol;
    this.session = session;
    this.publish = publish;
  }
  onQuote(q) {
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
