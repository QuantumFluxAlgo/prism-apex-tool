
import { Client } from 'pg';
import {
  computeSessionMetricsForSymbol,
  type RawBar,
} from './populate-session-metrics.js';
import type {
  LiquidityRegime,
  PriceVsVwap,
  SessionMetricsComputationResult,
  SessionMetricsPopulationContext,
  SessionQualityFlag,
  SessionType,
  TrendBias,
  VwapSlope,
  VolRegime,
  NewsWindow,
} from './types.js';

export interface SessionMetricsDto {
  symbol: string;
  sessionDate: string;
  sessionType: SessionType;
  sessionStartTs: string | null;
  sessionEndTs: string | null;
  sessionAtrPoints: number | null;
  sessionAtrBucket: string | null;
  intradayRangePoints: number | null;
  overnightRangePoints: number | null;
  volRegime: VolRegime | null;
  orStartTs: string | null;
  orEndTs: string | null;
  orLengthMinutes: number | null;
  orHigh: number | null;
  orLow: number | null;
  orWidthPoints: number | null;
  orWidthToAtrRatio: number | null;
  vwapOpenValue: number | null;
  vwapCloseValue: number | null;
  vwapSlope: VwapSlope | null;
  priceVsVwapAtOrEnd: PriceVsVwap | null;
  htfTrendBias: TrendBias | null;
  avgVolumeFirst30m: number | null;
  volumeSpikeFlag: boolean | null;
  liquidityRegime: LiquidityRegime | null;
  hasMajorNewsToday: boolean | null;
  newsWindow: NewsWindow;
  newsLabel: string | null;
  sessionQualityFlag: SessionQualityFlag | null;
  sessionSkipReason: string | null;
  barsAnalyzed: number;
  status: 'OK' | 'ERROR';
  errorCode: string | null;
  errorMessage: string | null;
  computedAt: string;
  version: string;
}

async function loadBarsForSymbolSession(input: {
  symbol: string;
  sessionDate: string; // YYYY-MM-DD (UTC)
}): Promise<RawBar[]> {
  const { symbol, sessionDate } = input;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // eslint-disable-next-line no-console
    console.warn(
      'SessionMetrics runtime: DATABASE_URL missing; returning NO_BARS for',
      symbol,
      sessionDate,
    );
    return [];
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    const res = await client.query(
      `
        SELECT symbol,
               ts_utc,
               open,
               high,
               low,
               close,
               volume
        FROM bars_1m
        WHERE symbol = $1
          AND ts_utc >= $2::date
          AND ts_utc <  ($2::date + interval '1 day')
        ORDER BY ts_utc ASC
      `,
      [symbol, sessionDate],
    );

    const bars: RawBar[] = res.rows.map((row: any) => {
      const tsUtc: Date | string = row.ts_utc;
      const ts = tsUtc instanceof Date ? tsUtc.toISOString() : String(tsUtc ?? '');

      return {
        ts,
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: row.volume != null ? Number(row.volume) : 0,
      } as RawBar;
    });

    return bars;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      'SessionMetrics runtime: failed to load bars_1m for',
      symbol,
      sessionDate,
      err,
    );
    return [];
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

export async function computeSessionMetricsForSymbolSession(input: {
  symbol: string;
  sessionDate: string;
}): Promise<SessionMetricsDto> {
  const { symbol, sessionDate } = input;

  const bars = await loadBarsForSymbolSession({ symbol, sessionDate });

  const context: SessionMetricsPopulationContext = {
    targetSessionDate: sessionDate,
    symbols: [symbol],
  };

  const result = computeSessionMetricsForSymbol(
    symbol,
    sessionDate,
    'RTH',
    bars,
    context,
  );

  const nowIso = new Date().toISOString();

  return mapResultToDto(result, bars.length, nowIso);
}

function mapResultToDto(
  result: SessionMetricsComputationResult,
  barsAnalyzed: number,
  computedAt: string,
): SessionMetricsDto {
  const isError = result.sessionQualityFlag === 'ERROR' || barsAnalyzed === 0;
  const status: SessionMetricsDto['status'] = isError ? 'ERROR' : 'OK';
  const errorCode = isError ? result.sessionSkipReason ?? 'NO_BARS' : null;
  const errorMessage = isError ? result.sessionSkipReason ?? 'Session metrics unavailable' : null;

  return {
    symbol: result.symbol,
    sessionDate: result.sessionDate,
    sessionType: result.sessionType,
    sessionStartTs: result.sessionStartTs ?? null,
    sessionEndTs: result.sessionEndTs ?? null,
    sessionAtrPoints: result.sessionAtrPoints ?? null,
    sessionAtrBucket: result.sessionAtrBucket ?? null,
    intradayRangePoints: result.intradayRangePoints ?? null,
    overnightRangePoints: result.overnightRangePoints ?? null,
    volRegime: result.volRegime ?? null,
    orStartTs: result.orStartTs ?? null,
    orEndTs: result.orEndTs ?? null,
    orLengthMinutes: result.orLengthMinutes ?? null,
    orHigh: result.orHigh ?? null,
    orLow: result.orLow ?? null,
    orWidthPoints: result.orWidthPoints ?? null,
    orWidthToAtrRatio: result.orWidthToAtrRatio ?? null,
    vwapOpenValue: result.vwapOpenValue ?? null,
    vwapCloseValue: result.vwapCloseValue ?? null,
    vwapSlope: result.vwapSlope ?? null,
    priceVsVwapAtOrEnd: result.priceVsVwapAtOrEnd ?? null,
    htfTrendBias: result.htfTrendBias ?? null,
    avgVolumeFirst30m: result.avgVolumeFirst30m ?? null,
    volumeSpikeFlag: result.volumeSpikeFlag ?? null,
    liquidityRegime: result.liquidityRegime ?? null,
    hasMajorNewsToday: result.hasMajorNewsToday ?? null,
    newsWindow: result.newsWindow,
    newsLabel: result.newsLabel ?? null,
    sessionQualityFlag: result.sessionQualityFlag ?? null,
    sessionSkipReason: result.sessionSkipReason ?? null,
    barsAnalyzed,
    status,
    errorCode,
    errorMessage,
    computedAt,
    version: 'v1',
  };
}
