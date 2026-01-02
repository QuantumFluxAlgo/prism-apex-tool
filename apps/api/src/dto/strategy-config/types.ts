import type { ORRConfig } from './orr.js';
import type { OSBConfig } from './osb.js';
import type { VwapFTConfig } from './vwapft.js';

export const STRATEGY_KEYS = ['orr', 'osb', 'vwap_ft'] as const;

export type StrategyKey = (typeof STRATEGY_KEYS)[number];

export type StrategyParamsMap = {
  orr: ORRConfig;
  osb: OSBConfig;
  vwap_ft: VwapFTConfig;
};

export interface StrategyConfigMeta {
  id: number | null;
  version: number;
  operator: string | null;
  createdAtUtc: string | null;
  updatedAtUtc: string | null;
}

export type StrategyConfigDto = {
  [K in StrategyKey]: StrategyConfigMeta & {
    strategy: K;
    params: StrategyParamsMap[K];
  };
}[StrategyKey];

export type StrategyConfigUpdateInput = {
  [K in StrategyKey]: {
    strategy: K;
    version?: number;
    operator?: string | null;
    params: StrategyParamsMap[K];
  };
}[StrategyKey];
