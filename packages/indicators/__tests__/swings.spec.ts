import { describe, it, expect } from 'vitest';
import { swings, SwingPoint } from '../src/swings.js';
import type { Bar1m } from '../src/types.js';

function makeBar(ts: number, high: number, low: number): Bar1m {
  return {
    ts: new Date(ts).toISOString(),
    open: low,
    high,
    low,
    close: high,
    volume: 1,
  };
}

describe('swings', () => {
  it('detects pivot points for k=2', () => {
    const base = Date.parse('2024-01-01T00:00:00Z');
    const highs = [10, 12, 15, 13, 11, 16, 14, 13, 17, 15, 14];
    const lows = [8, 9, 11, 10, 8, 12, 11, 9, 14, 13, 12];
    const bars: Bar1m[] = highs.map((h, i) => makeBar(base + i * 60000, h, lows[i]));
    const pts = swings(bars, 2);
    const expected: SwingPoint[] = [
      { index: 2, ts: bars[2].ts, price: bars[2].high, type: 'PH' },
      { index: 4, ts: bars[4].ts, price: bars[4].low, type: 'PL' },
      { index: 5, ts: bars[5].ts, price: bars[5].high, type: 'PH' },
      { index: 7, ts: bars[7].ts, price: bars[7].low, type: 'PL' },
      { index: 8, ts: bars[8].ts, price: bars[8].high, type: 'PH' },
    ];
    expect(pts).toEqual(expected);
  });

  it('handles plateaus preferring earliest', () => {
    const base = Date.parse('2024-01-01T00:00:00Z');
    const highs = [1, 3, 3, 2];
    const lows = [0, 1, 1, 0.5];
    const bars: Bar1m[] = highs.map((h, i) => makeBar(base + i * 60000, h, lows[i]));
    const pts = swings(bars, 1);
    expect(pts).toEqual([
      { index: 1, ts: bars[1].ts, price: bars[1].high, type: 'PH' },
    ]);
  });

  it('returns empty when too few bars', () => {
    const bars = [makeBar(Date.now(), 1, 0.5)];
    expect(swings(bars, 2)).toEqual([]);
  });
});
