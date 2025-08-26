import { describe, expect, it } from 'vitest';
import { vwap, osbSuggest, vwapFirstTouchSuggest } from '../index.js';
import type { Bar } from '../types.js';

describe('signals core', () => {
  it('computes VWAP', () => {
    const bars: Bar[] = [
      { ts: '2020-01-01T00:00:00Z', open: 0, high: 1, low: 0, close: 1, volume: 1 },
      { ts: '2020-01-01T00:01:00Z', open: 1, high: 2, low: 1, close: 2, volume: 1 },
    ];
    const vw = vwap(bars);
    expect(vw[0]).toBeCloseTo((1 + 0 + 1) / 3);
    const expectedSecond = ((1 + 0 + 1) / 3 + (2 + 1 + 2) / 3) / 2;
    expect(vw[1]).toBeCloseTo(expectedSecond);
  });

  it('suggests OSB breakout', () => {
    const bars: Bar[] = [
      { ts: '1', open: 1, high: 5, low: 1, close: 4 },
      { ts: '2', open: 4, high: 6, low: 3, close: 7 },
    ];
    const res = osbSuggest('ES', 'RTH', bars);
    expect(res.suggestions).toHaveLength(1);
    const s = res.suggestions[0];
    expect(s.side).toBe('BUY');
    expect(s.entry).toBe(7);
  });

  it('suggests VWAP first touch', () => {
    const bars: Bar[] = [
      { ts: '1', open: 1, high: 2, low: 0, close: 0.5, volume: 1 },
      { ts: '2', open: 0.5, high: 2, low: 0.5, close: 1.5, volume: 1 },
    ];
    const res = vwapFirstTouchSuggest('ES', bars);
    expect(res.suggestions).toHaveLength(1);
    expect(res.suggestions[0].side).toBe('BUY');
  });
});
