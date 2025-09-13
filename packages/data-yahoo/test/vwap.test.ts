import { describe, it, expect } from 'vitest';
import { initAVWAP, stepAVWAP, valueAVWAP } from '../src/vwap';

describe('weekly AVWAP', () => {
  it('accumulates correctly with positive volume', () => {
    let s = initAVWAP('2025-09-08T13:30:00Z');
    s = stepAVWAP(s, 10, 8, 9, 100);
    s = stepAVWAP(s, 11, 9, 10, 200);
    const v = valueAVWAP(s);
    expect(v).toBeGreaterThan(9);
    expect(v).toBeLessThan(10.5);
  });
  it('ignores zero/negative volume bars', () => {
    let s = initAVWAP('2025-09-08T13:30:00Z');
    s = stepAVWAP(s, 10, 8, 9, 0);
    const v = valueAVWAP(s);
    expect(Number.isFinite(v)).toBe(false);
  });
});
