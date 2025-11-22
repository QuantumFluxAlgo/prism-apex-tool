import {
  SessionMetricsComputationResult,
  SessionMetricsPopulationContext,
  SessionQualityFlag,
  LiquidityRegime,
  VolRegime,
  VwapSlope,
  PriceVsVwap,
  TrendBias,
  SessionType,
  NewsWindow,
} from './types.js';

/**
 * Minimal raw bar shape for SessionMetrics computations.
 * This is intentionally local to this module and can be adapted to
 * the real bar representation in later wiring steps.
 */
export interface RawBar {
  ts: string; // ISO timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Compute SessionMetrics for a single symbol × session from raw bars.
 *
 * This function is:
 * - pure (no side effects),
 * - offline (no DB calls or external dependencies),
 * - aligned with the session_metrics schema at a structural level.
 *
 * It is an initial implementation that may be refined under tests and
 * config-driven rules in later steps.
 */
export function computeSessionMetricsForSymbol(
  symbol: string,
  sessionDate: string,
  sessionType: SessionType,
  bars: RawBar[],
  _context: SessionMetricsPopulationContext,
): SessionMetricsComputationResult {
  if (!bars.length) {
    const quality: SessionQualityFlag = 'ERROR';

    return {
      symbol,
      sessionDate,
      sessionType,
      sessionStartTs: null,
      sessionEndTs: null,

      // Volatility & range
      sessionAtrPoints: null,
      sessionAtrBucket: null,
      intradayRangePoints: null,
      overnightRangePoints: null,
      volRegime: null,

      // OR
      orStartTs: null,
      orEndTs: null,
      orLengthMinutes: null,
      orHigh: null,
      orLow: null,
      orWidthPoints: null,
      orWidthToAtrRatio: null,

      // VWAP & trend
      vwapOpenValue: null,
      vwapCloseValue: null,
      vwapSlope: null,
      priceVsVwapAtOrEnd: null,
      htfTrendBias: null,

      // Liquidity & volume
      avgVolumeFirst30m: null,
      volumeSpikeFlag: null,
      liquidityRegime: null,

      // News
      hasMajorNewsToday: null,
      newsWindow: null as NewsWindow,
      newsLabel: null,

      // Quality
      sessionQualityFlag: quality,
      sessionSkipReason: 'NO_BARS',
    };
  }

  const sortedBars = [...bars].sort((a, b) => a.ts.localeCompare(b.ts));

  const sessionStartTs = sortedBars[0]?.ts ?? null;
  const sessionEndTs = sortedBars[sortedBars.length - 1]?.ts ?? null;

  // Volatility & range
  let sessionHigh = sortedBars[0].high;
  let sessionLow = sortedBars[0].low;
  let prevClose = sortedBars[0].close;
  let trSum = 0;
  let trCount = 0;

  for (const bar of sortedBars) {
    if (bar.high > sessionHigh) sessionHigh = bar.high;
    if (bar.low < sessionLow) sessionLow = bar.low;
  }

  for (let i = 1; i < sortedBars.length; i++) {
    const bar = sortedBars[i];
    const range = bar.high - bar.low;
    const highToPrevClose = Math.abs(bar.high - prevClose);
    const lowToPrevClose = Math.abs(bar.low - prevClose);
    const trueRange = Math.max(range, highToPrevClose, lowToPrevClose);
    trSum += trueRange;
    trCount += 1;
    prevClose = bar.close;
  }

  const sessionAtrPoints = trCount > 0 ? trSum / trCount : null;

  const intradayRangePoints = sessionHigh - sessionLow;
  const overnightRangePoints: number | null = null; // TODO: integrate prior close data when available.

  // For now we default volRegime to NORMAL when ATR is present.
  const volRegime: VolRegime | null = sessionAtrPoints !== null ? 'NORMAL' : null;
  const sessionAtrBucket: string | null = null; // TODO: derive bucket from ATR percentiles/config.

  // Opening Range (first 30 minutes heuristic)
  const orWindowMinutes = 30;
  let orStartTs: string | null = null;
  let orEndTs: string | null = null;
  let orHigh: number | null = null;
  let orLow: number | null = null;

  if (sessionStartTs) {
    const sessionStart = new Date(sessionStartTs).getTime();
    const orCutoff = sessionStart + orWindowMinutes * 60 * 1000;

    const orBars = sortedBars.filter((bar) => {
      const t = new Date(bar.ts).getTime();
      return t >= sessionStart && t < orCutoff;
    });

    if (orBars.length > 0) {
      orStartTs = orBars[0].ts;
      orEndTs = orBars[orBars.length - 1].ts;
      let _orHigh = orBars[0].high;
      let _orLow = orBars[0].low;

      for (const bar of orBars) {
        if (bar.high > _orHigh) _orHigh = bar.high;
        if (bar.low < _orLow) _orLow = bar.low;
      }

      orHigh = _orHigh;
      orLow = _orLow;
    }
  }

  const orWidthPoints =
    orHigh !== null && orLow !== null ? orHigh - orLow : null;
  const orWidthToAtrRatio =
    orWidthPoints !== null && sessionAtrPoints !== null && sessionAtrPoints !== 0
      ? orWidthPoints / sessionAtrPoints
      : null;
  const orLengthMinutes: number | null = orStartTs && orEndTs ? orWindowMinutes : null; // heuristic placeholder

  // VWAP & trend
  let vwapNumeratorSession = 0;
  let vwapDenominatorSession = 0;
  let vwapNumeratorOr = 0;
  let vwapDenominatorOr = 0;
  let lastOrClose: number | null = null;

  const sessionStartMs = sessionStartTs ? new Date(sessionStartTs).getTime() : null;
  const orCutoffMs =
    sessionStartMs !== null ? sessionStartMs + orWindowMinutes * 60 * 1000 : null;

  for (const bar of sortedBars) {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    vwapNumeratorSession += typicalPrice * bar.volume;
    vwapDenominatorSession += bar.volume;

    const tsMs = new Date(bar.ts).getTime();
    if (
      sessionStartMs !== null &&
      orCutoffMs !== null &&
      tsMs >= sessionStartMs &&
      tsMs < orCutoffMs
    ) {
      vwapNumeratorOr += typicalPrice * bar.volume;
      vwapDenominatorOr += bar.volume;
      lastOrClose = bar.close;
    }
  }

  const vwapCloseValue =
    vwapDenominatorSession > 0 ? vwapNumeratorSession / vwapDenominatorSession : null;
  const vwapOpenValue =
    vwapDenominatorOr > 0 ? vwapNumeratorOr / vwapDenominatorOr : vwapCloseValue;

  let vwapSlope: VwapSlope | null = null;
  let priceVsVwapAtOrEnd: PriceVsVwap | null = null;

  if (vwapOpenValue !== null && vwapCloseValue !== null) {
    const upThreshold = vwapOpenValue * 1.001;
    const downThreshold = vwapOpenValue * 0.999;

    if (vwapCloseValue > upThreshold) {
      vwapSlope = 'UP';
    } else if (vwapCloseValue < downThreshold) {
      vwapSlope = 'DOWN';
    } else {
      vwapSlope = 'FLAT';
    }
  }

  if (vwapOpenValue !== null && lastOrClose !== null) {
    const upperBand = vwapOpenValue * 1.001;
    const lowerBand = vwapOpenValue * 0.999;

    if (lastOrClose > upperBand) {
      priceVsVwapAtOrEnd = 'ABOVE';
    } else if (lastOrClose < lowerBand) {
      priceVsVwapAtOrEnd = 'BELOW';
    } else {
      priceVsVwapAtOrEnd = 'AROUND';
    }
  }

  const htfTrendBias: TrendBias | null = 'SIDEWAYS'; // TODO: derive from higher timeframe context.

  // Liquidity & volume
  let avgVolumeFirst30m: number | null = null;
  let volumeSpikeFlag: boolean | null = null;
  let liquidityRegime: LiquidityRegime | null = null;

  if (sessionStartMs !== null) {
    const cutoff = sessionStartMs + orWindowMinutes * 60 * 1000;
    const firstWindowBars = sortedBars.filter((bar) => {
      const t = new Date(bar.ts).getTime();
      return t >= sessionStartMs && t < cutoff;
    });

    if (firstWindowBars.length > 0) {
      const totalVol = firstWindowBars.reduce((acc, b) => acc + b.volume, 0);
      avgVolumeFirst30m = totalVol / firstWindowBars.length;

      let spike = false;
      if (avgVolumeFirst30m > 0) {
        const threshold = avgVolumeFirst30m * 2;
        for (const bar of firstWindowBars) {
          if (bar.volume > threshold) {
            spike = true;
            break;
          }
        }
      }
      volumeSpikeFlag = spike;
      liquidityRegime = 'NORMAL'; // TODO: refine classification.
    }
  }

  // News (config-driven, TODO)
  const hasMajorNewsToday: boolean | null = null;
  const newsWindow: NewsWindow = null;
  const newsLabel: string | null = null;

  // Session quality
  let sessionQualityFlag: SessionQualityFlag | null = 'OK';
  let sessionSkipReason: string | null = null;

  if (!bars.length) {
    sessionQualityFlag = 'ERROR';
    sessionSkipReason = 'NO_BARS';
  }

  // TODO: refine quality/skip decisions based on ATR, OR width, news, etc.

  return {
    symbol,
    sessionDate,
    sessionType,
    sessionStartTs,
    sessionEndTs,

    // Volatility & range
    sessionAtrPoints,
    sessionAtrBucket,
    intradayRangePoints,
    overnightRangePoints,
    volRegime,

    // OR
    orStartTs,
    orEndTs,
    orLengthMinutes,
    orHigh,
    orLow,
    orWidthPoints,
    orWidthToAtrRatio,

    // VWAP & trend
    vwapOpenValue,
    vwapCloseValue,
    vwapSlope,
    priceVsVwapAtOrEnd,
    htfTrendBias,

    // Liquidity & volume
    avgVolumeFirst30m,
    volumeSpikeFlag,
    liquidityRegime,

    // News
    hasMajorNewsToday,
    newsWindow,
    newsLabel,

    // Quality
    sessionQualityFlag,
    sessionSkipReason,
  };
}

/**
 * Compute SessionMetrics for all symbols in a given run, given bars grouped by symbol.
 *
 * This remains a pure function: no DB, no scheduler, no side effects.
 */
export function computeSessionMetricsForSymbols(
  context: SessionMetricsPopulationContext,
  barsBySymbol: Record<string, RawBar[]>,
): SessionMetricsComputationResult[] {
  const results: SessionMetricsComputationResult[] = [];

  for (const symbol of context.symbols) {
    const symbolBars = barsBySymbol[symbol] ?? [];
    const result = computeSessionMetricsForSymbol(
      symbol,
      context.targetSessionDate,
      'RTH', // TODO: derive session type from config/calendar.
      symbolBars,
      context,
    );
    results.push(result);
  }

  return results;
}
