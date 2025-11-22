/**
 * Types for SessionMetrics population.
 *
 * These interfaces are aligned with:
 * - docs/data/SESSION_METRICS.md
 * - docs/data/SESSION_METRICS_POPULATION.md
 *
 * IMPORTANT:
 * - No computation logic here.
 * - No imports from other modules.
 * - This file is safe to import into future jobs but is not yet wired into any runtime path.
 */

/**
 * Session type classification for a symbol's trading day.
 */
export type SessionType = 'RTH' | 'GLOBEX' | 'HALF_DAY' | string;

/**
 * Volatility regime derived from ATR / range.
 */
export type VolRegime = 'LOW' | 'NORMAL' | 'HIGH' | string;

/**
 * Liquidity regime derived from volume and other proxies.
 */
export type LiquidityRegime = 'NORMAL' | 'THIN' | 'DISTORTED' | string;

/**
 * Higher timeframe trend bias.
 */
export type TrendBias = 'UP' | 'DOWN' | 'SIDEWAYS' | string;

/**
 * VWAP slope classification near the decision window.
 */
export type VwapSlope = 'UP' | 'DOWN' | 'FLAT' | string;

/**
 * Relationship of price to VWAP at OR end or a reference time.
 */
export type PriceVsVwap = 'ABOVE' | 'BELOW' | 'AROUND' | string;

/**
 * News timing window for major macro events.
 */
export type NewsWindow = 'PRE_OPEN' | 'RTH_MORNING' | 'RTH_AFTERNOON' | null;

/**
 * Overall session quality flag for strategy eligibility.
 */
export type SessionQualityFlag = 'OK' | 'AVOID' | 'ERROR' | string;

/**
 * Context passed into the SessionMetrics population job.
 *
 * This describes "what to process" and "how" at a high level, but does not
 * embed any concrete implementation details (DB client, specific logger types, etc.).
 */
export interface SessionMetricsPopulationContext {
  /**
   * Date of the trading session to process (e.g. "2025-11-14").
   * Using string keeps this serialisable across boundaries; conversion to Date
   * can happen inside the job implementation later.
   */
  targetSessionDate: string;

  /**
   * Symbols to process for this run (e.g. ["ES", "NQ", "CL"]).
   */
  symbols: string[];

  /**
   * Optional flag for dry-run behaviour (e.g. compute but do not persist).
   * Implementation details will be defined later.
   */
  dryRun?: boolean;

  /**
   * Optional rough concurrency / batch size hints for the job.
   * Not wired yet, but useful for future scaling.
   */
  maxConcurrentSymbols?: number;
  batchSize?: number;

  /**
   * Optional logger contract, deliberately loose to avoid coupling to a
   * specific logging implementation.
   */
  logger?: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

/**
 * A single computed SessionMetrics record representing one row in the
 * session_metrics table for a given symbol × session.
 *
 * Types mirror the DB schema but use nullable fields for values that may
 * not be computable (e.g. missing data).
 */
export interface SessionMetricsComputationResult {
  // Identity & time bounds
  symbol: string;
  sessionDate: string; // ISO date string, aligns with session_date
  sessionType: SessionType;
  sessionStartTs: string | null; // ISO datetime, aligns with session_start_ts
  sessionEndTs: string | null;   // ISO datetime, aligns with session_end_ts

  // Volatility & range
  sessionAtrPoints: number | null;
  sessionAtrBucket: string | null; // raw bucket label; see VolRegime and related config
  intradayRangePoints: number | null;
  overnightRangePoints: number | null;
  volRegime: VolRegime | null;

  // Opening Range (OR) metrics
  orStartTs: string | null;
  orEndTs: string | null;
  orLengthMinutes: number | null;
  orHigh: number | null;
  orLow: number | null;
  orWidthPoints: number | null;
  orWidthToAtrRatio: number | null;

  // VWAP & trend context
  vwapOpenValue: number | null;
  vwapCloseValue: number | null;
  vwapSlope: VwapSlope | null;
  priceVsVwapAtOrEnd: PriceVsVwap | null;
  htfTrendBias: TrendBias | null;

  // Liquidity & volume
  avgVolumeFirst30m: number | null;
  volumeSpikeFlag: boolean | null;
  liquidityRegime: LiquidityRegime | null;

  // News flags (config-driven)
  hasMajorNewsToday: boolean | null;
  newsWindow: NewsWindow;
  newsLabel: string | null;

  // Session quality / skip metadata
  sessionQualityFlag: SessionQualityFlag | null;
  sessionSkipReason: string | null;
}
