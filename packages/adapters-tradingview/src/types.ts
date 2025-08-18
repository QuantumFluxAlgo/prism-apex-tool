import { z } from 'zod';

export const TvPayloadSchema = z.union([
  z.object({
    // Common JSON alert style from Pine v5
    alert_id: z.string().optional(),
    symbol: z.string().optional(),
    side: z.enum(['BUY', 'SELL']).optional(),
    price: z.number().optional(),
    reason: z.string().optional(),
    ts: z.string().optional(),   // ISO if provided by alert
    data: z.record(z.unknown()).optional(),
    message: z.string().optional(),
  }),
  // Fallback: anything -> we will try to parse from free text
  z.record(z.unknown())
]);

export type TvPayload = z.infer<typeof TvPayloadSchema>;

export interface TvAlert {
  id: string;          // stable id derived from fields
  symbol?: string;
  side?: 'BUY' | 'SELL';
  price?: number;
  reason?: string;
  ts: string;          // ISO timestamp (ingest time if missing)
  raw: unknown;        // raw payload for audit
}

export interface HumanAlert {
  id: string;
  text: string;        // plain English summary
}

export interface Candidate {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop?: number;
  targets?: number[];
}

export interface ParseResult {
  alert: TvAlert;
  human: HumanAlert;
  candidate?: Candidate;
}
