import { z } from 'zod';

export const TICKET_STRATEGIES = ['VWAP_FT', 'OSB', 'APX-DDB-01'] as const;

export const TicketSchema = z.object({
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  entry: z.number(),
  stop: z.number(),
  target: z.number(),
  qty: z.number(),
  accountId: z.string(),
  timestampUtc: z.string(),
  meta: z.object({
    strategy: z.enum(TICKET_STRATEGIES),
    rr: z.number(),
    guardrails: z.array(z.string()),
    sizingHint: z.string().optional(),
    consistencyNotes: z.string().optional(),
    canonicalCandidate: z.unknown().optional(),
  }),
  accepted: z.boolean(),
  reasons: z.array(z.string()).optional(),
});

export type Ticket = z.infer<typeof TicketSchema>;
export type TicketStrategy = (typeof TICKET_STRATEGIES)[number];
