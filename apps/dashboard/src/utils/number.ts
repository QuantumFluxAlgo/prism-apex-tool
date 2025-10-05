export function fmtPrice(value?: number | null, dp = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(dp);
}

export function fmtR(value?: number | null, dp = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const prefix = value > 0 ? '+' : value < 0 ? '' : '';
  return `${prefix}${value.toFixed(dp)}R`;
}

export function fmtPnlUSD(value?: number | null, dp = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(dp)}`;
}
