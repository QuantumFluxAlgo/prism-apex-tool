// apps/api/src/strategy/orr/orr-v3.ts
// Deterministic ORR v3 engine.

export type ORRSignalType = 'NO_TRADE' | 'LONG_SETUP' | 'SHORT_SETUP';
export type OdfTrend = 'UP' | 'DOWN' | 'FLAT' | 'UNKNOWN';

export interface OrrSessionMetricsSummary {
  status: 'OK' | 'INSUFFICIENT_DATA' | 'ERROR' | 'UNKNOWN';
  orWidth: number | null;
  orToAtrRatio: number | null;
  vwapSlopeClassification: OdfTrend;
}

export interface OrrSessionFlagsSummary {
  hasNewsFlag: boolean;
}

export interface OrrV3Config {
  minOrToAtrRatio: number;
  maxOrToAtrRatio: number;
  blockNewsSessions: boolean;
}

export interface OrrV3Input {
  symbol: string;
  sessionDateUtc: string;
  metrics: OrrSessionMetricsSummary | null;
  flags: OrrSessionFlagsSummary | null;
}

export interface ORRSignal {
  type: ORRSignalType;
  reason: string;
  symbol: string;
  sessionDateUtc: string;
}

export const DEFAULT_ORR_V3_CONFIG: OrrV3Config = {
  minOrToAtrRatio: 0.5,
  maxOrToAtrRatio: 2.5,
  blockNewsSessions: true,
};

export function createOrrV3Engine(config: OrrV3Config = DEFAULT_ORR_V3_CONFIG) {
  return (input: OrrV3Input): ORRSignal => {
    const { symbol, sessionDateUtc, metrics, flags } = input;

    if (config.blockNewsSessions && flags?.hasNewsFlag) {
      return { type: 'NO_TRADE', reason: 'NEWS_SESSION', symbol, sessionDateUtc };
    }

    if (!metrics) {
      return { type: 'NO_TRADE', reason: 'NO_SESSION_METRICS', symbol, sessionDateUtc };
    }

    if (metrics.status !== 'OK') {
      return {
        type: 'NO_TRADE',
        reason: `METRICS_STATUS_${metrics.status}`,
        symbol,
        sessionDateUtc,
      };
    }

    const { orWidth, orToAtrRatio, vwapSlopeClassification } = metrics;

    if (orWidth == null || orToAtrRatio == null) {
      return { type: 'NO_TRADE', reason: 'MISSING_OR_OR_ATR', symbol, sessionDateUtc };
    }

    if (
      orToAtrRatio < config.minOrToAtrRatio ||
      orToAtrRatio > config.maxOrToAtrRatio
    ) {
      return { type: 'NO_TRADE', reason: 'OR_ATR_OUT_OF_RANGE', symbol, sessionDateUtc };
    }

    if (vwapSlopeClassification === 'UP') {
      return { type: 'LONG_SETUP', reason: 'CLEAN_OR_UPTREND', symbol, sessionDateUtc };
    }

    if (vwapSlopeClassification === 'DOWN') {
      return { type: 'SHORT_SETUP', reason: 'CLEAN_OR_DOWNTREND', symbol, sessionDateUtc };
    }

    return { type: 'NO_TRADE', reason: 'NO_CLEAR_EDGE', symbol, sessionDateUtc };
  };
}
