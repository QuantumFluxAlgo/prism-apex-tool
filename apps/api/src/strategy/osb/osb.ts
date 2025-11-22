export type SessionFlag = 'NEWS' | 'FOMC' | 'ROLL' | 'HOLIDAY' | 'OTHER';

export interface SessionFlagsSummary {
  flags: SessionFlag[];
  hasNewsFlag: boolean;
}

export interface SessionMetricsSummary {
  orWidth: number | null | undefined;
  orToAtrRatio: number | null | undefined;
  vwapSlopeClassification: 'UP' | 'DOWN' | 'FLAT' | null | undefined;
}

export type OsbSignalType = 'LONG_SETUP' | 'SHORT_SETUP' | 'NO_TRADE';

export interface OsbSignal {
  type: OsbSignalType;
  reason: string;
}

export interface OsbEngineInput {
  metrics: SessionMetricsSummary | null | undefined;
  flags: SessionFlagsSummary | null | undefined;
}

export interface OsbEngineConfig {
  minOrToAtr?: number;
  maxOrToAtr?: number;
}

export type OsbEngine = (input: OsbEngineInput) => OsbSignal;

const DEFAULT_MIN_OR_TO_ATR = 0.75;
const DEFAULT_MAX_OR_TO_ATR = 2.5;

function makeSignal(type: OsbSignalType, reason: string): OsbSignal {
  return { type, reason };
}

export function createOsbEngine(config?: OsbEngineConfig): OsbEngine {
  const minOrToAtr = config?.minOrToAtr ?? DEFAULT_MIN_OR_TO_ATR;
  const maxOrToAtr = config?.maxOrToAtr ?? DEFAULT_MAX_OR_TO_ATR;

  return (input: OsbEngineInput): OsbSignal => {
    const metrics = input.metrics ?? null;
    const flags = input.flags ?? null;

    if (flags?.hasNewsFlag) {
      return makeSignal('NO_TRADE', 'NEWS_GUARDRAIL');
    }

    if (
      !metrics ||
      metrics.orWidth == null ||
      metrics.orToAtrRatio == null ||
      metrics.vwapSlopeClassification == null
    ) {
      return makeSignal('NO_TRADE', 'MISSING_METRICS');
    }

    const ratio = metrics.orToAtrRatio;
    if (ratio < minOrToAtr || ratio > maxOrToAtr) {
      return makeSignal('NO_TRADE', 'OR_ATR_OUT_OF_RANGE');
    }

    switch (metrics.vwapSlopeClassification) {
      case 'UP':
        return makeSignal('LONG_SETUP', 'VWAP_UP');
      case 'DOWN':
        return makeSignal('SHORT_SETUP', 'VWAP_DOWN');
      case 'FLAT':
      default:
        return makeSignal('NO_TRADE', 'VWAP_FLAT');
    }
  };
}
