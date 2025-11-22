import { atrWilderSeries } from '@prism-apex/indicators';
import type { Bar1m } from '@prism-apex/indicators';
import { getSpecByYahooSymbol, type SymbolSpec } from '@prism-apex/shared/contracts';
import type { Pool } from 'pg';

type PgClient = Pool | {
  query: (q: string, params?: any[]) => Promise<{ rows: any[] }>;
};

type MinuteBar = { ts_utc: string; open: number; high: number; low: number; close: number };

export interface OrrGateConfig {
  atrLookback: number;
  atrMinTicks: number;
  orMinMinutes: number;
  orMaxMinutes: number;
  minOrWidthTicks: number;
  continuationEnabled: boolean;
  continuationMax: number;
  sessionStartUtc: string;
  sessionEndUtc: string;
  volCacheSeconds: number;
}

export interface OrrGateMetrics {
  atrTicks?: number | null;
  orWidthTicks?: number | null;
  dynamicMinutes?: number | null;
}

export interface OrrGateResult {
  actionable: boolean;
  reason?: string;
  metrics: OrrGateMetrics;
  spec?: SymbolSpec;
  flags?: {
    continuationAllowed: boolean;
  };
}

export interface OperatorSizing {
  riskUsd: number | null;
  qty: number | null;
  riskPerContractUsd: number | null;
  expectedProfitUsd: number | null;
  expectedLossUsd: number | null;
}

const cache = new Map<string, { expiresAt: number; result: OrrGateResult }>();

const UTC_SUFFIX = 'Z';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseTime(parts: string, date: Date): Date {
  const [hh, mm = '0'] = parts.split(':');
  const clone = new Date(date);
  clone.setUTCHours(Number(hh), Number(mm), 0, 0);
  return clone;
}

function chooseDynamicWindow(atrTicks: number | null | undefined, cfg: OrrGateConfig): number {
  if (!Number.isFinite(atrTicks ?? NaN)) return cfg.orMinMinutes;
  if ((atrTicks ?? 0) <= cfg.atrMinTicks) return cfg.orMinMinutes;
  const highWater = cfg.atrMinTicks * 2;
  const ratio = clamp(((atrTicks ?? 0) - cfg.atrMinTicks) / Math.max(1, highWater - cfg.atrMinTicks), 0, 1);
  const span = cfg.orMaxMinutes - cfg.orMinMinutes;
  return Math.round(cfg.orMinMinutes + span * ratio);
}

export function getOrrConfig(): OrrGateConfig {
  const num = (value: string | undefined, fallback: number) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const bool = (value: string | undefined, fallback: boolean) => {
    if (value === undefined) return fallback;
    return ['1', 'true', 'yes'].includes(value.toLowerCase());
  };
  return {
    atrLookback: num(process.env.ORR_ATR_LOOKBACK, 14),
    atrMinTicks: num(process.env.ORR_ATR_MIN_TICKS, 8),
    orMinMinutes: num(process.env.ORR_OR_MIN_MINUTES, 10),
    orMaxMinutes: num(process.env.ORR_OR_MAX_MINUTES, 30),
    minOrWidthTicks: num(process.env.ORR_MIN_OR_WIDTH_TICKS, 6),
    continuationEnabled: bool(process.env.ORR_CONTINUATION_ENABLED, true),
    continuationMax: num(process.env.ORR_CONTINUATION_MAX, 1),
    sessionStartUtc: process.env.ORR_SESSION_START_UTC || '14:30',
    sessionEndUtc: process.env.ORR_SESSION_END_UTC || '16:00',
    volCacheSeconds: num(process.env.VOL_CACHE_SECONDS, 60),
  };
}

async function fetchBarsForSession(
  client: PgClient,
  symbol: string,
  sessionDate: string,
  cfg: OrrGateConfig,
): Promise<MinuteBar[]> {
  const baseDate = new Date(`${sessionDate}T00:00:00${UTC_SUFFIX}`);
  const sessionStart = parseTime(cfg.sessionStartUtc, baseDate);
  const sessionEnd = parseTime(cfg.sessionEndUtc, baseDate);
  if (sessionEnd <= sessionStart) sessionEnd.setUTCDate(sessionEnd.getUTCDate() + 1);
  const atrStart = new Date(sessionStart.getTime() - Math.max(30, cfg.atrLookback) * 60_000);
  const windowEnd = new Date(sessionStart.getTime() + cfg.orMaxMinutes * 60_000);
  const { rows } = await client.query(
    `
      SELECT ts_utc, open, high, low, close
      FROM bars_1m
      WHERE symbol = $1
        AND ts_utc BETWEEN $2::timestamptz AND $3::timestamptz
      ORDER BY ts_utc ASC
    `,
    [symbol, atrStart.toISOString(), windowEnd.toISOString()],
  );
  return rows as MinuteBar[];
}

function computeAtrTicks(bars: MinuteBar[], cfg: OrrGateConfig, tickSize: number | null | undefined): number | null {
  if (!tickSize || tickSize <= 0) return null;
  if (bars.length < cfg.atrLookback + 1) return null;
  const indicatorBars: Bar1m[] = bars.map((bar) => ({
    ts: bar.ts_utc,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: 0,
  }));
  const series = atrWilderSeries(indicatorBars, cfg.atrLookback);
  const last = series[series.length - 1];
  if (typeof last !== 'number' || !Number.isFinite(last)) return null;
  return Math.round((last / tickSize) * 1e4) / 1e4;
}

function computeOpenRangeWidthTicks(
  bars: MinuteBar[],
  sessionStart: Date,
  cfg: OrrGateConfig,
  tickSize: number | null | undefined,
): number | null {
  if (!tickSize || tickSize <= 0) return null;
  const rangeEnd = new Date(sessionStart.getTime() + cfg.orMinMinutes * 60_000);
  let hi = Number.NEGATIVE_INFINITY;
  let lo = Number.POSITIVE_INFINITY;
  for (const bar of bars) {
    const ts = Date.parse(bar.ts_utc);
    if (Number.isNaN(ts)) continue;
    if (ts < sessionStart.getTime() || ts > rangeEnd.getTime()) continue;
    hi = Math.max(hi, bar.high);
    lo = Math.min(lo, bar.low);
  }
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return null;
  const ticks = Math.round(((hi - lo) / tickSize) * 1e4) / 1e4;
  return ticks;
}

export async function getOrrGateResult(
  client: PgClient,
  symbol: string,
  sessionDate: string,
  cfg = getOrrConfig(),
): Promise<OrrGateResult> {
  const cacheKey = `${symbol}:${sessionDate}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > now) return hit.result;

  const spec = await getSpecByYahooSymbol(symbol);
  if (!spec || !spec.tickSize || !spec.tickValueUSD) {
    const fallback: OrrGateResult = {
      actionable: false,
      reason: 'tick-spec-missing',
      metrics: { atrTicks: null, orWidthTicks: null, dynamicMinutes: cfg.orMinMinutes },
      flags: { continuationAllowed: cfg.continuationEnabled },
    };
    cache.set(cacheKey, { expiresAt: now + cfg.volCacheSeconds * 1000, result: fallback });
    return fallback;
  }

  const bars = await fetchBarsForSession(client, symbol, sessionDate, cfg);
  const baseDate = new Date(`${sessionDate}T00:00:00${UTC_SUFFIX}`);
  const sessionStart = parseTime(cfg.sessionStartUtc, baseDate);

  const atrTicks = computeAtrTicks(bars, cfg, spec.tickSize);
  const orWidthTicks = computeOpenRangeWidthTicks(bars, sessionStart, cfg, spec.tickSize);
  const dynamicMinutes = chooseDynamicWindow(atrTicks, cfg);

  let actionable = true;
  let reason: string | undefined;
  if (atrTicks === null || atrTicks === undefined) {
    actionable = false;
    reason = 'atr-unavailable';
  } else if (atrTicks < cfg.atrMinTicks) {
    actionable = false;
    reason = 'atr-low';
  } else if (orWidthTicks === null || orWidthTicks === undefined) {
    actionable = false;
    reason = 'or-unavailable';
  } else if (orWidthTicks < cfg.minOrWidthTicks) {
    actionable = false;
    reason = 'or-narrow';
  }

  const result: OrrGateResult = {
    actionable,
    reason,
    metrics: { atrTicks, orWidthTicks, dynamicMinutes },
    spec,
    flags: { continuationAllowed: cfg.continuationEnabled },
  };
  cache.set(cacheKey, { expiresAt: now + cfg.volCacheSeconds * 1000, result });
  return result;
}

export function buildOperatorSizing(
  spec: SymbolSpec | undefined,
  entry: number | null | undefined,
  stop: number | null | undefined,
  target: number | null | undefined,
  riskUsd: number,
): OperatorSizing {
  if (!spec || !spec.tickSize || !spec.tickValueUSD) {
    return { riskUsd, qty: null, riskPerContractUsd: null, expectedLossUsd: null, expectedProfitUsd: null };
  }
  if (![entry, stop, target].every((value) => typeof value === 'number' && Number.isFinite(value as number))) {
    return { riskUsd, qty: null, riskPerContractUsd: null, expectedLossUsd: null, expectedProfitUsd: null };
  }
  const tickSize = spec.tickSize;
  const tickValue = spec.tickValueUSD;
  const stopTicks = Math.max(1, Math.round(Math.abs((entry as number) - (stop as number)) / tickSize));
  const riskPerContract = stopTicks * tickValue;
  const qty = Math.max(1, Math.floor(riskUsd / Math.max(riskPerContract, 1e-6)));
  const targetTicks = Math.round(Math.abs((target as number) - (entry as number)) / tickSize);
  const expectedLossUsd = qty * riskPerContract;
  const expectedProfitUsd = qty * targetTicks * tickValue;
  return {
    riskUsd,
    qty,
    riskPerContractUsd: riskPerContract,
    expectedLossUsd,
    expectedProfitUsd,
  };
}
