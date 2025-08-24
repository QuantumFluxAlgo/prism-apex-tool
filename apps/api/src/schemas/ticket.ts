import { z } from 'zod';

export const ticketSchema = z.object({
  id: z.string(),
  ts: z.string().optional(),
  symbol: z.string().optional(),
  side: z.string().optional(),
  qty: z.number().optional(),
  entry: z.number().optional(),
  stop: z.number().optional(),
  targets: z.array(z.number()).optional(),
  apex_blocked: z.boolean().optional(),
  reasons: z.array(z.string()).optional(),
});

export const ticketEntrySchema = z.object({
  when: z.string(),
  ticket: ticketSchema,
  reasons: z.array(z.string()),
});

export type Ticket = z.infer<typeof ticketSchema>;
export type TicketEntry = z.infer<typeof ticketEntrySchema>;
