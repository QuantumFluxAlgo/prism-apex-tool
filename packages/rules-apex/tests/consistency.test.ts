import { summarizeConsistency } from '../src/consistency';

describe('consistency', () => {
  it('summarizes pnl array', () => {
    const pnls = [
      { date: '2024-01-01', pnl: 100 },
      { date: '2024-01-02', pnl: 300 },
      { date: '2024-01-03', pnl: -50 },
    ];
    const res = summarizeConsistency(pnls, { dayShareLimit: 0.3, minProfitDayUsd: 50 });
    expect(res.totalProfit).toBe(400);
    expect(res.topDayShare).toBeCloseTo(0.75);
    expect(res.profitableDays).toBe(2);
    expect(res.limitBreached).toBe(true);
  });
});
