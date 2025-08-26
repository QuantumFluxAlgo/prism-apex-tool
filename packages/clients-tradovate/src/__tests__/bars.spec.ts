import { describe, expect, it } from 'vitest';
import { BarAggregator } from '../bars.js';

describe('BarAggregator', () => {
  it('rolls on minute boundary and publishes', () => {
    const bars: any[] = [];
    const agg = new BarAggregator('ES', 'ESZ4', 'RTH', (b) => bars.push(b));
    agg.onQuote({ ts: Date.UTC(2024, 0, 1, 12, 0, 10), price: 10, volume: 1 });
    agg.onQuote({ ts: Date.UTC(2024, 0, 1, 12, 0, 20), price: 12, volume: 2 });
    // next minute triggers publish
    agg.onQuote({ ts: Date.UTC(2024, 0, 1, 12, 1, 0), price: 11, volume: 3 });
    expect(bars).toHaveLength(1);
    expect(bars[0]).toEqual({
      ts: Date.UTC(2024, 0, 1, 12, 0, 0),
      open: 10,
      high: 12,
      low: 10,
      close: 12,
      volume: 3,
      symbol: 'ES',
      fullSymbol: 'ESZ4',
      session: 'RTH',
    });
  });
});
