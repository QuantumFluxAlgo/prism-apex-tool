export function computeConsistency(days, cfg = {}) {
  const config = {
    windowDays: 8,
    minProfitDays: 5,
    minDayPnL: 50,
    topDayMaxShare: 0.3,
    ...cfg,
  };
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const filtered = sorted.slice(-config.windowDays);
  const start = filtered[0]?.date ?? '';
  const end = filtered[filtered.length - 1]?.date ?? '';
  const totals = filtered.reduce(
    (acc, d) => {
      acc.net += d.net;
      acc.days++;
      if (d.net >= config.minDayPnL) acc.profitDays++;
      return acc;
    },
    { net: 0, days: 0, profitDays: 0 },
  );
  let topDay = { date: null, net: 0, share: 0 };
  for (const d of filtered) {
    if (d.net > topDay.net) topDay = { date: d.date, net: d.net, share: 0 };
  }
  topDay.share = totals.net > 0 ? topDay.net / totals.net : 0;
  const reasons = [];
  if (filtered.length < config.windowDays) reasons.push('noData');
  if (topDay.share > config.topDayMaxShare)
    reasons.push(`topday>${Math.round(config.topDayMaxShare * 100)}%`);
  if (totals.profitDays < config.minProfitDays) reasons.push(`profitDays<${config.minProfitDays}`);
  const passed = reasons.length === 0;
  return {
    window: { start, end },
    totals,
    topDay,
    passed,
    reasons,
  };
}
