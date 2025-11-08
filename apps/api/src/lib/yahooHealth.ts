const parseLag = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const OK_LAG_MIN = parseLag(process.env.YAHOO_OK_LAG_MIN, 25);
export const DEGRADED_LAG_MIN = parseLag(process.env.YAHOO_DEGRADED_LAG_MIN, 90);
const ALWAYS_ON = new Set(
  (process.env.YAHOO_ALWAYS_ON ?? 'BTC-USD')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

export type YahooLagRow = {
  symbol: string;
  last_bar_utc: string;
  minutes_behind: number;
};

export type YahooSummary = {
  status: 'ok' | 'degraded' | 'down' | 'paused';
  ok_lag_min: number;
  degraded_lag_min: number;
  rows: YahooLagRow[];
  now_utc: string;
};

export function classifyYahooStatus(rows: YahooLagRow[], now: Date = new Date()): YahooSummary {
  const safeRows = rows.map((row) => ({
    ...row,
    minutes_behind: Number.isFinite(row.minutes_behind) ? row.minutes_behind : Number.POSITIVE_INFINITY,
  }));
  const nonAlwaysOn = safeRows.filter((row) => !ALWAYS_ON.has(row.symbol));
  const isWeekend = now.getUTCDay() === 0 || now.getUTCDay() === 6;
  const nonAlwaysStale =
    nonAlwaysOn.length > 0 && nonAlwaysOn.every((row) => row.minutes_behind >= DEGRADED_LAG_MIN);

  let status: YahooSummary['status'];
  if (isWeekend && nonAlwaysStale) {
    status = 'paused';
  } else if (safeRows.length === 0) {
    status = 'down';
  } else if (safeRows.every((row) => row.minutes_behind < OK_LAG_MIN)) {
    status = 'ok';
  } else if (safeRows.some((row) => row.minutes_behind < DEGRADED_LAG_MIN)) {
    status = 'degraded';
  } else {
    status = 'down';
  }

  return {
    status,
    ok_lag_min: OK_LAG_MIN,
    degraded_lag_min: DEGRADED_LAG_MIN,
    rows: safeRows,
    now_utc: now.toISOString(),
  };
}

export function yahooStatusToService(status: YahooSummary['status']): 'green' | 'amber' | 'red' | 'grey' {
  switch (status) {
    case 'ok':
      return 'green';
    case 'degraded':
      return 'amber';
    case 'paused':
      return 'grey';
    default:
      return 'red';
  }
}
