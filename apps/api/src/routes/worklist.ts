/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// V2 HARDENING (auto-waive): TS waiver for this API file. See PRISM_APEX_V2_BUILD_AUDIT.md.

import type { FastifyInstance } from 'fastify';
import { trackEvent } from '@prism-apex/analytics';

type WorklistSide = 'LONG' | 'SHORT';
type WorklistRiskBucket = 'GREEN' | 'AMBER' | 'RED';

export interface WorklistTicketDto {
  ticketId: string;
  symbol: string;
  strategy: 'ORR' | 'OSB' | 'VWAP-FT';
  side: WorklistSide;
  score: number; // 0–100
  riskBucket: WorklistRiskBucket;
  ageMinutes: number;
  pnlTicks: number; // positive/negative ticks
  sessionDate: string; // YYYY-MM-DD
  createdAt: string; // ISO
  notes?: string;
}

/**
 * Temporary canonical-shaped mock data for Worklist V2.
 * This mirrors the A3 cockpit layout used on the dashboard.
 *
 * Phase A: replace this with a real engine-backed implementation.
 */
function buildMockWorklistTickets(now: Date = new Date()): WorklistTicketDto[] {
  // Anchor to a stable session date derived from "now"
  const sessionDate = now.toISOString().slice(0, 10);

  const mk = (partial: Omit<WorklistTicketDto, 'sessionDate'>): WorklistTicketDto => ({
    ...partial,
    sessionDate: partial.createdAt.slice(0, 10) || sessionDate,
  });

  return [
    mk({
      ticketId: 't-orr-001',
      symbol: 'MESZ4',
      strategy: 'ORR',
      side: 'LONG',
      score: 86,
      riskBucket: 'GREEN',
      ageMinutes: 4,
      pnlTicks: 10,
      createdAt: `${sessionDate}T14:00:00Z`,
      notes: 'Clean OR reversal after strong open drive.',
    }),
    mk({
      ticketId: 't-orr-002',
      symbol: 'NQZ4',
      strategy: 'ORR',
      side: 'SHORT',
      score: 78,
      riskBucket: 'AMBER',
      ageMinutes: 9,
      pnlTicks: -4,
      createdAt: `${sessionDate}T13:55:00Z`,
      notes: 'Aggressive fade; news risk elevated.',
    }),
    mk({
      ticketId: 't-osb-010',
      symbol: 'CLF5',
      strategy: 'OSB',
      side: 'LONG',
      score: 72,
      riskBucket: 'GREEN',
      ageMinutes: 16,
      pnlTicks: 0,
      createdAt: `${sessionDate}T13:48:00Z`,
      notes: 'Breakout from OR high, low volatility regime.',
    }),
    mk({
      ticketId: 't-vwapft-021',
      symbol: 'MESZ4',
      strategy: 'VWAP-FT',
      side: 'SHORT',
      score: 65,
      riskBucket: 'RED',
      ageMinutes: 22,
      pnlTicks: -12,
      createdAt: `${sessionDate}T13:40:00Z`,
      notes: 'Fade against strong trend; poor session quality.',
    }),
  ];
}

export default async function worklistRoute(app: FastifyInstance) {
  async function handler() {
    const tickets = buildMockWorklistTickets();
    trackEvent('worklist.summary', { count: tickets.length });

    // Shape is intentionally simple; UI can evolve to use `total` or other fields later.
    return {
      total: tickets.length,
      tickets,
    };
  }

  // Support both legacy and API-prefixed paths, like status/tickets routes.
  app.get('/worklist', async (_req, reply) => {
    const payload = await handler();
    return reply.send(payload);
  });

  app.get('/api/worklist', async (_req, reply) => {
    const payload = await handler();
    return reply.send(payload);
  });
}

