import { describe, it, expect } from 'vitest';
import { planLongOnlyRetest } from '../src/selector';

describe('APX-DDB-01 long-only selector', () => {
  const tick = 0.25;
  it('returns a plan when price >= weekly VWAP', () => {
    const p = planLongOnlyRetest({
      tickSize: tick,
      currentPrice: 5332.0,
      weeklyVwap: 5320.0,
      priorHigh: 5334.75,
      bufferTicks: 2,
      minStopTicks: 12,
      rr: 2,
    });
    expect(p).not.toBeNull();
    expect(p!.side).toBe('Buy');
    expect(p!.stopTicks).toBeGreaterThanOrEqual(12);
    expect(p!.entry).toBeCloseTo(5334.25, 5);
  });

  it('returns null when price < weekly VWAP', () => {
    const p = planLongOnlyRetest({
      tickSize: tick,
      currentPrice: 5318.0,
      weeklyVwap: 5320.0,
      priorHigh: 5334.75,
      bufferTicks: 2,
      minStopTicks: 12,
      rr: 2,
    });
    expect(p).toBeNull();
  });

  it('enforces rr >= 2 and rounds to tick', () => {
    const p = planLongOnlyRetest({
      tickSize: tick,
      currentPrice: 5400.01,
      weeklyVwap: 5300.0,
      priorHigh: 5400.13,
      bufferTicks: 1,
      minStopTicks: 12,
      rr: 1.2,
    });
    expect(p).not.toBeNull();
    expect(p!.rr).toBeGreaterThanOrEqual(2);
    expect(Number.isInteger(p!.entry / tick)).toBe(true);
  });
});
