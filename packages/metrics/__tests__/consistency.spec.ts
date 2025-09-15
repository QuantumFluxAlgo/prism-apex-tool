import { describe, it, expect } from 'vitest';
import { computeConsistency, type DailyPnL } from '../src/consistency.js';

describe('computeConsistency', () => {
  it('eligible when total>0, >=5 profit days, bestDayShare<=0.30', () => {
    const days: DailyPnL[] = [
      { date: '2025-08-12', pnl: -80 },
      { date: '2025-08-13', pnl: 250 },
      { date: '2025-08-14', pnl: 180 },
      { date: '2025-08-15', pnl: 90 },
      { date: '2025-08-18', pnl: 410 }, // best day
      { date: '2025-08-19', pnl: 95 },
      { date: '2025-08-20', pnl: 200 },
      { date: '2025-08-21', pnl: 275 },
    ];
    const r = computeConsistency(days, 8);
    expect(r.totalPnL).toBe(1420);
    expect(r.bestDayPnL).toBe(410);
    expect(r.bestDayShare).toBeCloseTo(410 / 1420, 6);
    expect(r.profitDayCount).toBe(7);
    expect(r.eligible).toBe(true);
  });

  it('ineligible when total<=0', () => {
    const days: DailyPnL[] = [
      { date: '2025-08-12', pnl: -80 },
      { date: '2025-08-13', pnl: -50 },
    ];
    const r = computeConsistency(days, 8);
    expect(r.totalPnL).toBe(-130);
    expect(r.bestDayShare).toBe(0);
    expect(r.eligible).toBe(false);
  });

  it('ineligible when bestDayShare>0.30', () => {
    const days: DailyPnL[] = [
      { date: '2025-08-12', pnl: 10 },
      { date: '2025-08-13', pnl: 10 },
      { date: '2025-08-14', pnl: 10 },
      { date: '2025-08-15', pnl: 10 },
      { date: '2025-08-18', pnl: 200 }, // best day dominates
      { date: '2025-08-19', pnl: 10 },
      { date: '2025-08-20', pnl: 10 },
      { date: '2025-08-21', pnl: 10 },
    ];
    const r = computeConsistency(days, 8);
    expect(r.bestDayPnL).toBe(200);
    expect(r.bestDayShare).toBeCloseTo(200 / 270, 6);
    expect(r.eligible).toBe(false);
  });
});
