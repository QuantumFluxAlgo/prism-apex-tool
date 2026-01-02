import { z } from 'zod';

export const ORR_ALLOWED_SESSIONS = ['RTH', 'ETH'] as const;

export const ORRConfigSchema = z.object({
  openingRangeMinutes: z.number().int().positive(),
  maxRange: z.number().finite(),
  minRR: z.number().finite(),
  retestDistance: z.number().finite(),
  stopSize: z.number().finite(),
  enableRetestFilter: z.boolean(),
  allowedSession: z.enum(ORR_ALLOWED_SESSIONS),
});

export type ORRConfig = z.infer<typeof ORRConfigSchema>;
