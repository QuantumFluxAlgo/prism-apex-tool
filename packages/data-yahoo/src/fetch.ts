const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SECOND_IN_MS = 1000;
const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';

type QuoteEntry = {
  high?: Array<number | null>;
  low?: Array<number | null>;
  close?: Array<number | null>;
  volume?: Array<number | null>;
};

type ChartResult = {
  meta?: { symbol?: string | null };
  timestamp?: Array<number | null>;
  indicators?: { quote?: QuoteEntry[] };
};

type YahooChartResponse = {
  chart?: { result?: ChartResult[] };
};

export interface YahooBar {
  symbol: string;
  ts: string;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function ensureDate(value: Date, name: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${name} must be a valid Date instance`);
  }
}

export async function fetchYahooBars(symbol: string, from: Date, to: Date): Promise<YahooBar[]> {
  if (!symbol || !symbol.trim()) {
    throw new Error('symbol is required');
  }
  ensureDate(from, 'from');
  ensureDate(to, 'to');

  if (to.getTime() < from.getTime()) {
    throw new Error('`to` must be on or after `from`');
  }

  const period1 = Math.floor(from.getTime() / SECOND_IN_MS);
  const period2 = Math.floor((to.getTime() + DAY_IN_MS - 1) / SECOND_IN_MS);

  const url = new URL(`${YAHOO_CHART_BASE}${encodeURIComponent(symbol)}`);
  url.searchParams.set('period1', String(period1));
  url.searchParams.set('period2', String(period2));
  url.searchParams.set('interval', '1d');
  url.searchParams.set('events', 'history');
  url.searchParams.set('includeAdjustedClose', 'true');

  const response = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Yahoo chart request failed: ${response.status} ${response.statusText}`.trim());
  }

  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];

  if (!result || !Array.isArray(result.timestamp)) {
    throw new Error('Yahoo chart payload missing timestamps');
  }

  const quote = result.indicators?.quote?.[0];
  if (!quote) {
    throw new Error('Yahoo chart payload missing quote data');
  }

  const symbolFromMeta =
    typeof result.meta?.symbol === 'string' && result.meta.symbol.trim()
      ? result.meta.symbol
      : symbol;

  const { high = [], low = [], close = [], volume = [] } = quote;

  const bars: YahooBar[] = [];

  for (let i = 0; i < result.timestamp.length; i += 1) {
    const ts = result.timestamp[i];
    const h = high[i];
    const l = low[i];
    const c = close[i];
    const v = volume[i];

    if (
      typeof ts !== 'number' ||
      typeof h !== 'number' ||
      typeof l !== 'number' ||
      typeof c !== 'number' ||
      typeof v !== 'number' ||
      !Number.isFinite(ts) ||
      !Number.isFinite(h) ||
      !Number.isFinite(l) ||
      !Number.isFinite(c) ||
      !Number.isFinite(v)
    ) {
      continue;
    }

    bars.push({
      symbol: symbolFromMeta,
      ts: new Date(ts * SECOND_IN_MS).toISOString(),
      high: h,
      low: l,
      close: c,
      volume: v,
    });
  }

  return bars;
}
