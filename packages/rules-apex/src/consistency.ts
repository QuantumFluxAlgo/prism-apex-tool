export function summarizeConsistency(
  daily: { date: string; pnl: number }[],
  opts: { dayShareLimit: number; minProfitDayUsd: number },
): {
  totalProfit: number;
  topDayShare: number;
  profitableDays: number;
  limitBreached: boolean;
} {
  const profits = daily.map((d) => Math.max(0, d.pnl));
  const totalProfit = profits.reduce((sum, p) => sum + p, 0);
  const maxProfit = profits.length > 0 ? Math.max(...profits) : 0;
  const topDayShare = totalProfit > 0 ? maxProfit / totalProfit : 0;
  const profitableDays = daily.filter((d) => d.pnl >= opts.minProfitDayUsd).length;
  const limitBreached = topDayShare > opts.dayShareLimit;
  return { totalProfit, topDayShare, profitableDays, limitBreached };
}
