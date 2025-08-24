import { describe, expect, it } from 'vitest';
import { generateSummary, calculatePayoutStatus } from '../index.js';

describe('analytics helpers', () => {
  it('calculates payout eligibility', () => {
    const status = calculatePayoutStatus(3000);
    expect(status.eligible).toBe(true);
    expect(status.cumulativePnL).toBe(3000);
  });

  it('generates summary snapshot', () => {
    const events = [
      { pnl: 1000, fees: 50, type: 'TRADE' },
      { pnl: 500, fees: 25, type: 'PANIC' },
    ];
    const summary = generateSummary(events, new Date('2025-01-02'));
    expect(summary.pnl).toEqual({ gross: 1500, net: 1425 });
    expect(summary.breaches).toHaveLength(1);
    expect(summary.payoutStatus.eligible).toBe(false);
  });
});
