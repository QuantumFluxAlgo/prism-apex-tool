import { describe, expect, it } from 'vitest';

import { computePnL } from '../src/pnl.js';

describe('computePnL (direction-aware)', () => {
  it('handles LONG direction for ES with per-contract values', () => {
    const result = computePnL({
      entryPrice: 5000,
      targetPrice: 5005,
      stopPrice: 4999,
      tickSize: 0.25,
      tickValueUSD: 12.5,
      direction: 'LONG',
      quantity: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.ticksToTarget).toBe(20);
    expect(result.ticksToStop).toBe(4);
    expect(result.pnlTargetUSD).toBe(250);
    expect(result.pnlStopUSD).toBe(-50);
    expect(result.riskReward).toBe(5);
  });

  it('handles SHORT direction where lower target is favorable', () => {
    const result = computePnL({
      entryPrice: 5000,
      targetPrice: 4995,
      stopPrice: 5001,
      tickSize: 0.25,
      tickValueUSD: 12.5,
      direction: 'SHORT',
    });

    expect(result.ok).toBe(true);
    expect(result.ticksToTarget).toBe(20);
    expect(result.ticksToStop).toBe(4);
    expect(result.pnlTargetUSD).toBe(250);
    expect(result.pnlStopUSD).toBe(-50);
    expect(result.riskReward).toBe(5);
  });

  it('fails gracefully when tick spec is missing', () => {
    const result = computePnL({
      entryPrice: 1,
      targetPrice: 2,
      stopPrice: 0.5,
      tickSize: null,
      tickValueUSD: null,
      direction: 'LONG',
    });

    expect(result.ok).toBe(false);
    expect(result.pnlTargetUSD).toBeNull();
    expect(result.reason).toMatch(/tick spec/i);
  });
});
