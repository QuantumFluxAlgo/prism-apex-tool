import { z } from 'zod';

export const positionSchema = z.object({
  contracts: z.number(),
  stopLoss: z.number().optional(),
});

export const tradeSchema = z.object({
  contracts: z.number(),
  stopLoss: z.number().optional(),
  day: z.string(),
  profit: z.number(),
});

export const accountStateSchema = z.object({
  phase: z.enum(['evaluation','funded','payout']),
  balance: z.number(),
  equityHigh: z.number(),
  openPositions: z.array(positionSchema),
  tradeHistory: z.array(tradeSchema),
  dayPnL: z.record(z.number()),
  trailingDrawdown: z.number(),
  isEndOfDay: z.boolean().optional(),
  resetsUsed: z.number().optional(),
  tradingDuringNews: z.boolean().optional(),
  payoutHistory: z.array(z.string()).optional(),
  payoutRequestPct: z.number().optional(),
});

export type AccountState = z.infer<typeof accountStateSchema>;
