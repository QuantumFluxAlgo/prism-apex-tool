import { z } from 'zod';

/**
 * Ticket strategy IDs.
 *
 * Canonical persisted strategy IDs (preferred):
 * - APX-DDB-01
 * - APX-OSB-01
 * - APX-VWAP-FT
 *
 * Legacy aliases remain accepted for backwards compatibility / inbound payloads,
 * but write paths should normalize to canonical IDs.
 */
export const TICKET_STRATEGIES = [
  // Canonical (preferred)
  'APX-DDB-01',
  'APX-OSB-01',
  'APX-VWAP-FT',

  // Legacy aliases (accepted)
  'ORR',
  'OSB',
  'VWAP_FT',
  'VWAP-FT',
] as const;

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
