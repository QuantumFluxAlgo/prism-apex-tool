export function fmtPrice(value?: number | null, dp?: number) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const places = dp ?? (Math.abs(value) < 10 ? 3 : 2);
  return value.toFixed(places);
}

export function fmtR(value?: number | null, dp = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '' : '';
  return `${sign}${value.toFixed(dp)}R`;
}

export function fmtPnlUSD(value?: number | null, dp = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(dp)}`;
}
