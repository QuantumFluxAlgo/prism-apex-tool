import { z } from 'zod';

export const VWAPFT_DIRECTION_OPTIONS = ['LONG', 'SHORT', 'BOTH'] as const;

export const VwapFTConfigSchema = z.object({
  deviationBands: z.array(z.number().positive()).min(1),
  minATR: z.number().positive(),
  allowedDirections: z.enum(VWAPFT_DIRECTION_OPTIONS),
  lookbackPeriod: z.number().int().positive(),
  sessionWindow: z.string().min(1),
});

export type VwapFTConfig = z.infer<typeof VwapFTConfigSchema>;
