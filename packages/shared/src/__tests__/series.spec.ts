import { describe, expect, it } from 'vitest';
import { openingRange, sessionVWAP } from '../series.js';
import type { Bar } from '../types.js';

describe('series utilities', () => {
  const bars: Bar[] = [
    {
      ts: '2024-05-13T13:30:00Z',
      symbol: 'ES',
      interval: '1m',
      o: 10,
      h: 12,
      l: 9,
      c: 11,
      v: 100,
    },
    {
      ts: '2024-05-13T13:31:00Z',
      symbol: 'ES',
      interval: '1m',
      o: 11,
      h: 13,
      l: 10,
      c: 12,
      v: 200,
    },
    {
      ts: '2024-05-13T13:32:00Z',
      symbol: 'ES',
      interval: '1m',
      o: 12,
      h: 14,
      l: 11,
      c: 13,
      v: 300,
    },
  ];

  it('computes opening range', () => {
    const start = new Date('2024-05-13T13:30:00Z');
    const end = new Date('2024-05-13T13:31:00Z');
    const { high, low } = openingRange(bars, start, end);
    expect(high).toBe(13);
    expect(low).toBe(9);
  });

  it('computes session VWAP', () => {
    const start = new Date('2024-05-13T13:30:00Z');
    const end = new Date('2024-05-13T13:32:00Z');
    const vwap = sessionVWAP(bars, start, end);
    expect(vwap).toBeCloseTo(12, 10);
  });

  it('throws on empty window', () => {
    const start = new Date('2024-05-13T13:33:00Z');
    const end = new Date('2024-05-13T13:34:00Z');
    expect(() => openingRange(bars, start, end)).toThrow();
    expect(() => sessionVWAP(bars, start, end)).toThrow();
  });

  it('guards against zero volume', () => {
    const zeroBars = bars.map((b) => ({ ...b, v: 0 }));
    const start = new Date('2024-05-13T13:30:00Z');
    const end = new Date('2024-05-13T13:32:00Z');
    expect(() => sessionVWAP(zeroBars, start, end)).toThrow('Total volume is zero');
  });
});
