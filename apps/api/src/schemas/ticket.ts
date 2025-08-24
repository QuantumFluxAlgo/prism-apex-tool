import { z } from 'zod';

export const ticketSchema = z.object({
  when: z.string(),
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  qty: z.number(),
  entry: z.number(),
  stop: z.number(),
  targets: z.array(z.number()),
  apex_blocked: z.boolean().default(false),
  reasons: z.array(z.string()).default([]),
});

export type TicketPayload = z.infer<typeof ticketSchema>;
