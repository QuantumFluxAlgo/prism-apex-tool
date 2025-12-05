import { describe, expect, it } from 'vitest';

import { buildPnLDisplay } from '../utils/pnlDisplay';

describe('buildPnLDisplay', () => {
  it('returns fallback when spec is not yet verified', async () => {
    const result = await buildPnLDisplay('EURUSD=X', 100, 110, 90, 'LONG');

    expect(result.showNumbers).toBe(false);
    expect(result.reason).toMatch(/verified tick size\/value/i);
  });

  it('formats PnL numbers when a verified spec exists', async () => {
    const entry = 1.07;
    const target = 1.0716;
    const stop = 1.0684;

    const result = await buildPnLDisplay('6E=F', entry, target, stop, 'LONG', 1);

    expect(result.showNumbers).toBe(true);
    expect(result.ticksToTarget).toBe(16);
    expect(result.ticksToStop).toBe(16);
    expect(result.pnlTargetUSD).toBeCloseTo(200, 5);
    expect(result.pnlStopUSD).toBeCloseTo(-200, 5);
    expect(result.rr).toBeCloseTo(1, 5);
    expect(result.friendly?.tickValue).toBe('$12.50 / tick');
    expect(result.friendly?.target).toBe('16 ticks × $12.50 = $200.00');
    expect(result.friendly?.stop).toBe('16 ticks × $12.50 = $-200.00');
  });
});
