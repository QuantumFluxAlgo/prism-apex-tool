
type RawBar = any;
type SessionMetricsComputationResult = any;

/**
 * SessionMetrics runtime wiring (Phase 1 Step 1.8a, Option A).
 *
 * Pipeline:
 *   (symbol, sessionDate) -> bars -> computeSessionMetricsForSymbol -> SessionMetricsDto
 *
 * Bar source:
 *   - Reads 1m intraday bars from the bars_1m table in Postgres via DATABASE_URL.
 */

import { Client } from 'pg';
import { computeSessionMetricsForSymbol } from './populate-session-metrics.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const computeSessionMetricsForSymbolAny: any = computeSessionMetricsForSymbol;


export interface SessionMetricsDto {
  sessionDate: string;
  symbol: string;
  timeframe: string;

  status: 'OK' | 'ERROR';
  errorCode: string | null;
  errorMessage: string | null;

  barCount: number;
  hasOpenRange: boolean;

  sessionHigh: number | null;
  sessionLow: number | null;
  sessionRange: number | null;
  atr: number | null;

  orStartTime: string | null;
  orEndTime: string | null;
  orHigh: number | null;
  orLow: number | null;
  orWidth: number | null;
  orToAtrRatio: number | null;

  vwapOpen: number | null;
  vwapClose: number | null;
  vwapSlope: number | null;
  vwapSlopeClassification: 'UP' | 'DOWN' | 'FLAT' | null;

  createdAt: string;
  updatedAt: string;
  version: string | null;
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

  const result = computeSessionMetricsForSymbolAny({
    symbol,
    sessionDate,
    bars,
  });

  const nowIso = new Date().toISOString();

  const dto: SessionMetricsDto = {
    sessionDate,
    symbol,
    timeframe: result.timeframe,

    status: result.status,
    errorCode: result.errorCode ?? null,
    errorMessage: result.errorMessage ?? null,

    barCount: result.barCount,
    hasOpenRange: result.hasOpenRange,

    sessionHigh: result.sessionHigh ?? null,
    sessionLow: result.sessionLow ?? null,
    sessionRange: result.sessionRange ?? null,
    atr: result.atr ?? null,

    orStartTime: result.orStartTime ?? null,
    orEndTime: result.orEndTime ?? null,
    orHigh: result.orHigh ?? null,
    orLow: result.orLow ?? null,
    orWidth: result.orWidth ?? null,
    orToAtrRatio: result.orToAtrRatio ?? null,

    vwapOpen: result.vwapOpen ?? null,
    vwapClose: result.vwapClose ?? null,
    vwapSlope: result.vwapSlope ?? null,
    vwapSlopeClassification: result.vwapSlopeClassification ?? null,

    createdAt: nowIso,
    updatedAt: nowIso,
    version: result.version ?? 'v1',
  };

  return dto;
}