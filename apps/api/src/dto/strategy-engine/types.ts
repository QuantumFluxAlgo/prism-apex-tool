import { z } from 'zod';

export const strategyKeySchema = z.union([
  z.literal('orr'),
  z.literal('osb'),
  z.literal('vwapft'),
]);

export type StrategyKey = z.infer<typeof strategyKeySchema>;

export const enginePreviewRequestSchema = z.object({
  strategy: strategyKeySchema,
  symbol: z.string().min(1),
  sessionDate: z.string().min(1),
  configVersion: z.number().int().positive().optional(),
});

export type EnginePreviewRequest = z.infer<typeof enginePreviewRequestSchema>;

export const engineSignalSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  direction: z.union([z.literal('LONG'), z.literal('SHORT')]),
  price: z.number(),
  reason: z.string().min(1),
  entryPrice: z.number().optional(),
  stopPrice: z.number().optional(),
  targetPrice: z.number().optional(),
  ticksToStop: z.number().optional(),
  ticksToTarget: z.number().optional(),
  riskPerContractUSD: z.number().optional(),
  rewardPerContractUSD: z.number().optional(),
});

export type EngineSignal = z.infer<typeof engineSignalSchema>;

export const enginePreviewResponseSchema = z.object({
  strategy: strategyKeySchema,
  symbol: z.string().min(1),
  sessionDate: z.string().min(1),
  configVersion: z.number().int().positive().optional(),
  signals: z.array(engineSignalSchema),
  meta: z.object({
    engineVersion: z.string().min(1),
    riskEngineVersion: z.string().min(1),
    strategyConfigVersion: z.number().int().positive().nullable(),
    barCount: z.number().int().nonnegative(),
    sessionStart: z.string().nullable(),
    sessionEnd: z.string().nullable(),
    notes: z.string().optional(),
    safetyEnvelope: z.string().min(1).optional(),
    safetyEnvelopeDropped: z.number().int().nonnegative().optional(),
  }),
});

export type EnginePreviewResponse = z.infer<typeof enginePreviewResponseSchema>;
