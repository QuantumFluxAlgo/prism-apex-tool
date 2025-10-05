export function fmtPrice(v?: number | null) {
  if (v === null || v === undefined) return '—';
  const dp = Math.abs(v) < 10 ? 3 : 2;
  return v.toFixed(dp);
}

export function fmtPnL(v?: number | null) {
  if (v === null || v === undefined) return '—';
  const formatted = v.toFixed(2);
  return (v > 0 ? '+' : '') + formatted;
}

export function calcR(entry?: number | null, stop?: number | null, target?: number | null) {
  if ([entry, stop, target].some((value) => value === null || value === undefined)) return null;
  const risk = Math.abs((entry as number) - (stop as number));
  const reward = Math.abs((target as number) - (entry as number));
  if (risk === 0) return null;
  return reward / risk;
}
