import { describe, it, expect } from 'vitest';
import { computeConsistency } from '../src/compute.js';
import type { DayPnL } from '../src/types.js';

describe('computeConsistency', () => {
  it('passes when top day share ≤30% and ≥5 profit days', () => {
    const days: DayPnL[] = [
      { date: '2024-01-01', net: 100 },
      { date: '2024-01-02', net: 80 },
      { date: '2024-01-03', net: 70 },
      { date: '2024-01-04', net: 60 },
      { date: '2024-01-05', net: 55 },
      { date: '2024-01-06', net: 50 },
      { date: '2024-01-07', net: 40 },
      { date: '2024-01-08', net: 30 },
    ];
    const res = computeConsistency(days);
    expect(res.passed).toBe(true);
    expect(res.reasons).toHaveLength(0);
  });

  it('fails when top day share >30%', () => {
    const days: DayPnL[] = [
      { date: '2024-01-01', net: 200 },
      { date: '2024-01-02', net: 50 },
      { date: '2024-01-03', net: 50 },
      { date: '2024-01-04', net: 50 },
      { date: '2024-01-05', net: 50 },
      { date: '2024-01-06', net: 50 },
      { date: '2024-01-07', net: 50 },
      { date: '2024-01-08', net: 50 },
    ];
    const res = computeConsistency(days);
    expect(res.passed).toBe(false);
    expect(res.reasons).toContain('topday>30%');
  });

  it('fails when fewer than 8 days or <5 profit days', () => {
    const days: DayPnL[] = [
      { date: '2024-01-01', net: 100 },
      { date: '2024-01-02', net: 80 },
      { date: '2024-01-03', net: 70 },
      { date: '2024-01-04', net: 60 },
    ];
    const res = computeConsistency(days);
    expect(res.passed).toBe(false);
    expect(res.reasons).toContain('noData');
    expect(res.reasons).toContain('profitDays<5');
  });

  it('treats share as 0 when total ≤0', () => {
    const days: DayPnL[] = [
      { date: '2024-01-01', net: -10 },
      { date: '2024-01-02', net: -20 },
      { date: '2024-01-03', net: -30 },
      { date: '2024-01-04', net: -40 },
      { date: '2024-01-05', net: -50 },
      { date: '2024-01-06', net: -60 },
      { date: '2024-01-07', net: -70 },
      { date: '2024-01-08', net: -80 },
    ];
    const res = computeConsistency(days);
    expect(res.topDay.share).toBe(0);
    expect(res.passed).toBe(false);
    expect(res.reasons).toContain('profitDays<5');
  });
});
