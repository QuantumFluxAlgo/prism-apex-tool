import { z } from 'zod';

export const AccountSchema = z.object({
  netLiq: z.number(),
  cash: z.number(),
  margin: z.number(),
  dayPnlRealized: z.number(),
  dayPnlUnrealized: z.number(),
});

export type Account = z.infer<typeof AccountSchema>;

export const PositionSchema = z.object({
  symbol: z.string(),
  qty: z.number(),
  avgPrice: z.number(),
  unrealizedPnl: z.number(),
});

export type Position = z.infer<typeof PositionSchema>;

export const OrderSchema = z.object({
  id: z.string().or(z.number()).transform(String),
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  limitPrice: z.number().optional(),
  stopPrice: z.number().optional(),
  status: z.enum(['WORKING', 'FILLED', 'CANCELED']),
  ocoGroupId: z.string().optional(),
});

export type Order = z.infer<typeof OrderSchema>;

export const BarSchema = z.object({
  ts: z.string(), // ISO UTC
  symbol: z.string(),
  interval: z.enum(['1m', '5m']),
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number(),
});

export type Bar = z.infer<typeof BarSchema>;

export const LastSchema = z.object({
  symbol: z.string(),
  last: z.number(),
  ts: z.string(),
});

export type Last = z.infer<typeof LastSchema>;

// Generic API error
export class TradovateClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TradovateClientError';
  }
}

