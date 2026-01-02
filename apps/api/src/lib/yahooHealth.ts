const parseLag = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const GREEN_LAG_SECONDS = parseLag(process.env.YAHOO_GREEN_LAG_SECONDS, 120);
const AMBER_LAG_SECONDS = parseLag(process.env.YAHOO_AMBER_LAG_SECONDS, 300);
export const OK_LAG_MIN = GREEN_LAG_SECONDS / 60;
export const DEGRADED_LAG_MIN = AMBER_LAG_SECONDS / 60;
const ALWAYS_ON = new Set(
  (process.env.YAHOO_ALWAYS_ON ?? 'BTC-USD')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

export type YahooLagRow = {
  symbol: string;
  last_bar_timestamp: string;
  lag_seconds: number;
  /**
   * Backwards compatibility fields (deprecated).
   */
  last_bar_utc?: string;
  minutes_behind?: number;
  status: YahooSymbolStatus;
};

export type YahooSymbolStatus = 'GREEN' | 'AMBER' | 'RED';

export type YahooSummary = {
  status: 'ok' | 'degraded' | 'down' | 'paused';
  ok_lag_min: number;
  degraded_lag_min: number;
  rows: YahooLagRow[];
  now_utc: string;
};

function statusFromLagSeconds(lagSeconds: number): YahooSymbolStatus {
  if (!Number.isFinite(lagSeconds) || lagSeconds === Number.POSITIVE_INFINITY) {
    return 'RED';
  }
  if (lagSeconds <= GREEN_LAG_SECONDS) return 'GREEN';
  if (lagSeconds <= AMBER_LAG_SECONDS) return 'AMBER';
  return 'RED';
}

export function classifyYahooStatus(
  rows: Array<{ symbol: string; last_bar_timestamp: string; lag_seconds: number }>,
  now: Date = new Date(),
): YahooSummary {
  const safeRows: YahooLagRow[] = rows.map((row) => {
    const lagSeconds = Number.isFinite(row.lag_seconds) ? row.lag_seconds : Number.POSITIVE_INFINITY;
    return {
      symbol: row.symbol,
      last_bar_timestamp: row.last_bar_timestamp,
      lag_seconds: lagSeconds,
      last_bar_utc: row.last_bar_timestamp,
      minutes_behind: Number.isFinite(lagSeconds) ? lagSeconds / 60 : Number.POSITIVE_INFINITY,
      status: statusFromLagSeconds(lagSeconds),
    };
  });
  const nonAlwaysOn = safeRows.filter((row) => !ALWAYS_ON.has(row.symbol));
  const isWeekend = now.getUTCDay() === 0 || now.getUTCDay() === 6;
  const nonAlwaysStale =
    nonAlwaysOn.length > 0 && nonAlwaysOn.every((row) => row.status === 'RED');

  let status: YahooSummary['status'];
  if (isWeekend && nonAlwaysStale) {
    status = 'paused';
  } else if (safeRows.length === 0) {
    status = 'down';
  } else if (safeRows.every((row) => row.status === 'GREEN')) {
    status = 'ok';
  } else if (safeRows.some((row) => row.status !== 'RED')) {
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
