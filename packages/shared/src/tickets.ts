import { z } from 'zod';

export const canonicalTicketStatusValues = [
  'PENDING',
  'ACTIONED',
  'EXPIRED',
  'CANCELLED',
  'REJECTED',
  'FILLED',
  // Transitional legacy statuses surfaced in dashboards; remove once Worklist V2
  // fully adopts the canonical lifecycle.
  'OPEN',
  'CLOSED',
  'COMPLETE',
] as const;

export type CanonicalTicketStatus = (typeof canonicalTicketStatusValues)[number];

export const canonicalTicketSourceValues = ['ENGINE', 'LAB', 'MANUAL'] as const;

export type CanonicalTicketSource = (typeof canonicalTicketSourceValues)[number];

export type CanonicalCandidateTicket = CanonicalTicket & { status: 'PENDING' };

/**
 * Canonical operator-facing ticket contract shared across dashboard, analytics, and system health.
 *
 * Price guardrails follow Apex operator guidance:
 * - LONG tickets expect targetPrice > entryPrice > stopPrice
 * - SHORT tickets expect stopPrice > entryPrice > targetPrice
 * These rules are documented here and enforced by guardrails elsewhere.
 */
export interface CanonicalTicket {
  id: string;
  symbol: string;
  sessionDateUtc: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  exitPrice?: number | null;
  entryTicksFromRef?: number | null;
  stopTicks: number;
  targetTicks: number;
  quantity: number;
  perContractRisk: number;
  totalRisk: number;
  expectedReward: number;
  rrMultiple: number;
  pnl?: number | null;
  pnlRMultiple?: number | null;
  strategyId: string;
  strategyVersion?: string | null;
  contextRegime?: string | null;
  contextAtrBucket?: string | null;
  contextOrType?: string | null;
  tags?: string[];
  status: CanonicalTicketStatus;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  completedAtUtc?: string | null;
  completedBy?: string | null;
  accountId?: string | null;
  notes?: string | null;
  source?: CanonicalTicketSource;
}

const finiteNumber = z.number().finite();
const positiveInt = finiteNumber.int().positive();
const positiveNumber = finiteNumber.gt(0);
const nonNegativeNumber = finiteNumber.min(0);
const nullableFiniteNumber = finiteNumber.nullable().optional();

export const canonicalTicketSchema: z.ZodType<CanonicalTicket> = z.object({
  id: z.string().min(1, 'ticket id is required'),
  symbol: z.string().min(1, 'symbol is required'),
  sessionDateUtc: z.string().min(1, 'session date is required'),
  side: z.union([z.literal('LONG'), z.literal('SHORT')]),
  entryPrice: finiteNumber,
  stopPrice: finiteNumber,
  targetPrice: finiteNumber,
  exitPrice: nullableFiniteNumber,
  entryTicksFromRef: nullableFiniteNumber,
  stopTicks: positiveNumber,
  targetTicks: positiveNumber,
  quantity: positiveInt,
  perContractRisk: nonNegativeNumber,
  totalRisk: nonNegativeNumber,
  expectedReward: nonNegativeNumber,
  rrMultiple: finiteNumber,
  pnl: nullableFiniteNumber,
  pnlRMultiple: nullableFiniteNumber,
  strategyId: z.string().min(1, 'strategyId is required'),
  strategyVersion: z.string().min(1).optional().nullable(),
  contextRegime: z.string().min(1).optional().nullable(),
  contextAtrBucket: z.string().min(1).optional().nullable(),
  contextOrType: z.string().min(1).optional().nullable(),
  tags: z.array(z.string().min(1)).optional(),
  status: z.enum(canonicalTicketStatusValues),
  createdAtUtc: z.string().min(1, 'createdAtUtc is required'),
  updatedAtUtc: z.string().min(1).optional().nullable(),
  completedAtUtc: z.string().min(1).optional().nullable(),
  completedBy: z.string().min(1).optional().nullable(),
  accountId: z.string().min(1).optional().nullable(),
  notes: z.string().min(1).optional().nullable(),
  source: z.enum(canonicalTicketSourceValues).optional(),
});
