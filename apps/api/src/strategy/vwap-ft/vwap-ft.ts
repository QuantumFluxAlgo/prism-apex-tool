export type VwapFtSignalDirection = 'LONG' | 'SHORT';
export type VwapFtSignal = {
  kind: 'VWAP_FT_SETUP';
  direction: VwapFtSignalDirection;
  reason: string;
};

export type VwapFtSessionMetrics = {
  orToAtrRatio?: number | null;
  vwapSlopeClassification?: 'UP' | 'DOWN' | 'FLAT' | null;
};

export type VwapFtSessionFlags = {
  hasNewsFlag: boolean;
};

export type VwapFtContext = {
  symbol: string;
  sessionDateUtc: string;
  sessionMetrics?: VwapFtSessionMetrics | null;
  sessionFlags?: VwapFtSessionFlags | null;
};

export type VwapFtEngineConfig = {
  minOrToAtr?: number;
  maxOrToAtr?: number;
};

export type VwapFtEngine = (ctx: VwapFtContext) => VwapFtSignal[];

export function createVwapFtEngine(config?: VwapFtEngineConfig): VwapFtEngine {
  const effective: Required<VwapFtEngineConfig> = {
    minOrToAtr: config?.minOrToAtr ?? 0.3,
    maxOrToAtr: config?.maxOrToAtr ?? 2.5,
  };

  return (ctx: VwapFtContext): VwapFtSignal[] => {
    const { sessionMetrics, sessionFlags } = ctx;

    if (sessionFlags?.hasNewsFlag) {
      return [];
    }

    if (
      !sessionMetrics ||
      sessionMetrics.orToAtrRatio == null ||
      sessionMetrics.vwapSlopeClassification == null
    ) {
      return [];
    }

    const ratio = sessionMetrics.orToAtrRatio;
    if (ratio < effective.minOrToAtr || ratio > effective.maxOrToAtr) {
      return [];
    }

    const slope = sessionMetrics.vwapSlopeClassification;
    if (slope === 'UP') {
      return [
        {
          kind: 'VWAP_FT_SETUP',
          direction: 'LONG',
          reason: 'VWAP slope UP with acceptable OR:ATR',
        },
      ];
    }

    if (slope === 'DOWN') {
      return [
        {
          kind: 'VWAP_FT_SETUP',
          direction: 'SHORT',
          reason: 'VWAP slope DOWN with acceptable OR:ATR',
        },
      ];
    }

    return [];
  };
}
