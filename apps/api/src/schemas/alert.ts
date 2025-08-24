import { z } from 'zod';

export const alertSchema = z.object({
  id: z.string(),
  ts: z.string(),
  symbol: z.string().optional(),
  side: z.enum(['BUY','SELL']).optional(),
  price: z.number().optional(),
  reason: z.string().optional(),
  raw: z.unknown(),
});

export const parseResultSchema = z.object({
  alert: alertSchema,
  human: z.object({ text: z.string() }),
});

export const alertEntrySchema = alertSchema.extend({
  human: z.string(),
  acknowledged: z.boolean(),
  hash: z.string(),
});

export type AlertParseResult = z.infer<typeof parseResultSchema>;
export type AlertEntry = z.infer<typeof alertEntrySchema>;
