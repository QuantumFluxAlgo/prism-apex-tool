import { z } from 'zod';

export const accountStateSchema = z.object({
  phase: z.enum(['evaluation', 'funded', 'payout']),
  balance: z.number(),
  equityHigh: z.number(),
  openPositions: z.array(
    z.object({
      contracts: z.number(),
      stopLoss: z.number().optional(),
    })
  ),
  tradeHistory: z.array(
    z.object({
      contracts: z.number(),
      stopLoss: z.number().optional(),
      day: z.string(),
      profit: z.number(),
    })
  ),
  dayPnL: z.record(z.number()),
  trailingDrawdown: z.number(),
  isEndOfDay: z.boolean().optional(),
  resetsUsed: z.number().optional(),
  tradingDuringNews: z.boolean().optional(),
  payoutHistory: z.array(z.string()).optional(),
  payoutRequestPct: z.number().optional(),
});

export type AccountStatePayload = z.infer<typeof accountStateSchema>;
