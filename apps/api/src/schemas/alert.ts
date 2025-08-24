import { z } from 'zod';

export const alertSchema = z.object({
  alert: z.object({
    id: z.string(),
    ts: z.string(),
    symbol: z.string().optional(),
    side: z.enum(['BUY', 'SELL']).optional(),
    price: z.number().optional(),
    reason: z.string().optional(),
    raw: z.unknown(),
  }),
  human: z.object({ text: z.string() }),
});

export type AlertPayload = z.infer<typeof alertSchema>;
