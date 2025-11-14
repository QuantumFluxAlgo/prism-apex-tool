/**
 * SessionMetrics API route (Phase 1 Step 1.8a)
 *
 * This file defines the SessionMetrics response shape and is the intended home
 * for a read-only HTTP endpoint that exposes per-session, per-symbol metrics
 * derived from intraday bars.
 *
 * It is currently a stub and is NOT wired into the API router.
 * Implementation should align with:
 *   - docs/data/session-metrics-data-model.md
 *   - apps/api/src/jobs/session-metrics/*
 *
 * Next steps (future Codex tasks):
 *   - Decide how SessionMetrics are persisted or computed on-demand.
 *   - Implement an actual handler using the repo's routing pattern.
 *   - Wire this file into the router index/registration.
 */

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

/**
 * Placeholder export so that this module compiles even before the route is wired.
 * The actual route handler should be added in a follow-up Step 1.8a task.
 */
export {};
