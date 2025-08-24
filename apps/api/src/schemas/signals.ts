import { z } from 'zod';

export const BarSchema = z.object({
  ts: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
});

export const SuggestionSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  qty: z.number(),
  entry: z.number(),
  stop: z.number(),
  targets: z.array(z.number()),
  apex_blocked: z.boolean().optional(),
  reasons: z.array(z.string()),
  meta: z.record(z.unknown()).optional(),
});

export const SuggestionResultSchema = z.object({
  suggestions: z.array(SuggestionSchema),
});

export const OSBInput = z.object({
  symbol: z.string(),
  session: z.enum(['RTH', 'ETH']),
  bars: z.array(BarSchema).min(10),
});

export const VWAPInput = z.object({
  symbol: z.string(),
  bars: z.array(BarSchema).min(10),
});
