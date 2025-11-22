import { z } from 'zod';
import { ORRConfigSchema } from './orr.js';
import { OSBConfigSchema } from './osb.js';
import { VwapFTConfigSchema } from './vwapft.js';
import {
  STRATEGY_KEYS,
  type StrategyConfigUpdateInput,
  type StrategyKey,
  type StrategyParamsMap,
} from './types.js';

export const StrategyKeyEnum = z.enum(STRATEGY_KEYS);

export const strategyParamSchema = z.object({
  strategy: z.preprocess((value) => (typeof value === 'string' ? value.toLowerCase() : value), StrategyKeyEnum),
});

const versionField = z.number().int().positive().optional();
const operatorField = z.string().min(1).max(120).optional().nullable();

const orrPayloadSchema = z
  .object({
    version: versionField,
    operator: operatorField,
    params: ORRConfigSchema,
  })
  .strict();

const osbPayloadSchema = z
  .object({
    version: versionField,
    operator: operatorField,
    params: OSBConfigSchema,
  })
  .strict();

const vwapPayloadSchema = z
  .object({
    version: versionField,
    operator: operatorField,
    params: VwapFTConfigSchema,
  })
  .strict();

export const STRATEGY_CONFIG_SCHEMA_MAP = {
  orr: ORRConfigSchema,
  osb: OSBConfigSchema,
  vwap_ft: VwapFTConfigSchema,
} as const satisfies Record<StrategyKey, z.ZodType<StrategyParamsMap[StrategyKey]>>;

export const STRATEGY_UPDATE_SCHEMA_MAP = {
  orr: orrPayloadSchema,
  osb: osbPayloadSchema,
  vwap_ft: vwapPayloadSchema,
} as const satisfies Record<StrategyKey, z.ZodType<Omit<StrategyConfigUpdateInput, 'strategy'>>>;

export type StrategyParams = z.infer<typeof strategyParamSchema> & { strategy: StrategyKey };
export type StrategyConfigUpdateDto = StrategyConfigUpdateInput;

export function getStrategyUpdateSchema(strategy: StrategyKey) {
  return STRATEGY_UPDATE_SCHEMA_MAP[strategy];
}
