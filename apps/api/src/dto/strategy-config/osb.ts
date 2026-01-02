import { z } from 'zod';

export const OSB_DIRECTION_BIAS = ['LONG', 'SHORT', 'BOTH'] as const;

export const OSBConfigSchema = z.object({
  openingRangeMinutes: z.number().int(),
  breakoutDistance: z.number().finite(),
  volatilityFilter: z.number().finite(),
  rrMultiple: z.number().finite(),
  directionBias: z.enum(OSB_DIRECTION_BIAS),
});

export type OSBConfig = z.infer<typeof OSBConfigSchema>;
