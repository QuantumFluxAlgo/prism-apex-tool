/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// V2 HARDENING (auto-waive): TS waiver for this API file. See PRISM_APEX_V2_BUILD_AUDIT.md.
/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { loadRegistry } from '@prism-apex/config';
import { guardSuggestion, type Suggestion } from '../jobs/ticketizer.js';
import { getConfig } from '../config/env.js';
import { getRecentTicketSizes } from '../store/tickets.js';
import { isTestMode } from '../utils/testMode.js';
import { appendTickets, readTickets, type MockTicket } from '../utils/mockStore.js';
import { parseTicketQualityFilters, applyQualityFilters } from './ticketQualityFilters.js';
import { emitTicketQualityTelemetry } from '../services/tickets/ticketsTelemetry.js';
import type { TicketRiskDecisionDto } from './dto/riskDecisionDto.js';
import type { CanonicalCandidateTicket } from '@prism-apex/shared';
import { buildCanonicalApprovedTicketView } from './dto/canonicalTicketView.js';

type DebugSuggestion = Suggestion & {
  strategy?: string;
  price?: number;
  size?: number;
};

const DEFAULT_RISK_DECISION: TicketRiskDecisionDto = {
  allowed: true,
  reason: 'Not evaluated (Phase 3.5 placeholder)',
  codes: ['OK'],
  maxContractsAllowed: null,
  warnings: [],
};

type BarReplayBody = {
  symbol: string;
  strategy: string;
  bars: Array<{ t: string; o: number; h: number; l: number; c: number; v?: number }>;
};

type DebugReplayRequest = FastifyRequest<{ Body: DebugSuggestion[] | BarReplayBody }>;

function toMockTicketsFromSuggestions(payload: DebugSuggestion[], tickets: any[]): MockTicket[] {
  return tickets.map((ticket, idx) => {
    const suggestion = payload[idx] ?? payload[0];
    return {
      id: ticket.id ?? randomUUID(),
      ts: ticket.timestampUtc ?? new Date().toISOString(),
      symbol: ticket.symbol ?? suggestion.symbol,
      strategy: ticket.meta?.strategy ?? suggestion.strategy,
      side: ticket.side === 'SELL' ? 'SHORT' : 'LONG',
      price: ticket.entry ?? ticket.price ?? suggestion.price ?? 0,
      size: ticket.qty ?? ticket.size ?? suggestion.size ?? 1,
      status: ticket.accepted ? 'ACCEPTED' : 'REJECTED',
      meta: { ...(ticket.meta ?? {}), seeded: true, source: 'debug-replay:suggestions' },
    };
  });
}

export default async function ticketsDebugRoute(app: FastifyInstance) {
  const registry = loadRegistry();
  const account = registry.accounts?.[0] ?? {
    id: 'TEST',
    phase: 'funded',
    maxContracts: 1,
    bufferCleared: true,
  };
  const cfg = getConfig();

  app.get('/tickets/debug', async (req, reply) => {
    const qualityFilters = parseTicketQualityFilters((req as any).query ?? {});
    const rawTickets = readTickets() as MockTicket[];

    const normalized = rawTickets.map((ticket) => {
      const t = ticket as any;
      return {
        ...t,
        contracts: t.size ?? null,
        riskDollars: t.riskDollars ?? t.meta?.riskDollars ?? null,
        rewardDollars: t.rewardDollars ?? t.meta?.rewardDollars ?? null,
        rrMultiple: t.rrMultiple ?? t.meta?.rrMultiple ?? null,
        actualPnLDollars: t.actualPnLDollars ?? null,
        actualRRMultiple: t.actualRRMultiple ?? null,
        sessionMetrics: t.sessionMetrics ?? null,
        riskDecision: t.riskDecision ?? DEFAULT_RISK_DECISION,
      };
    });

    const filteredTickets = applyQualityFilters(normalized, qualityFilters);

    await emitTicketQualityTelemetry({
      route: 'tickets-debug',
      filters: qualityFilters,
      totalBefore: normalized.length,
      totalAfter: filteredTickets.length,
    });

    return reply.send(filteredTickets);
  });

  app.post('/tickets/debug-replay', async (req: DebugReplayRequest, reply) => {
    const body = req.body;

    if (Array.isArray(body)) {
      const payload = body as Suggestion[];
      const ctx = {
        accountId: account.id,
        phase: (account.phase as 'eval' | 'funded') ?? 'funded',
        maxContracts: account.maxContracts ?? 1,
        bufferCleared: account.bufferCleared ?? true,
        recentSizes: getRecentTicketSizes(account.id),
        flatByUtc: cfg.time.flatByUtc,
      };
      const tickets = payload.map((suggestion) => guardSuggestion(suggestion, ctx));

      if (isTestMode()) {
        const mockTickets = toMockTicketsFromSuggestions(payload, tickets);
        appendTickets(mockTickets);
      }

      return reply.send(
        tickets.map((ticket) => {
          const t = ticket as any;
          return {
            ...t,
            contracts: t.qty ?? t.size ?? null,
            riskDollars: t.meta?.riskDollars ?? null,
            rewardDollars: t.meta?.rewardDollars ?? null,
            rrMultiple: t.meta?.rrMultiple ?? null,
            sessionMetrics: null,
            riskDecision: DEFAULT_RISK_DECISION,
            canonicalCandidate: (t.meta?.canonicalCandidate as CanonicalCandidateTicket | undefined) ?? null,
            canonicalApproved: buildCanonicalApprovedTicketView(t) ?? null,
          };
        }),
      );
    }

    if (!isTestMode()) {
      return reply.code(400).send({ error: 'bars replay requires TEST_MODE=1' });
    }

    const barsBody = body as BarReplayBody;
    if (!barsBody?.symbol || !barsBody?.strategy || !Array.isArray(barsBody?.bars) || barsBody.bars.length === 0) {
      reply.code(400);
      return reply.send({ error: 'symbol, strategy, and bars[] are required' });
    }

    const tickets: MockTicket[] = barsBody.bars.map((bar) => ({
      id: randomUUID(),
      ts: new Date(bar.t).toISOString(),
      symbol: barsBody.symbol,
      strategy: barsBody.strategy,
      side: 'LONG',
      price: bar.c,
      size: 1,
      status: 'NEW',
      meta: { seeded: true, source: 'debug-replay:bars' },
    }));

    appendTickets(tickets);
    return reply.send({
      added: tickets.length,
      tickets: tickets.map((ticket) => ({
        ...ticket,
        contracts: ticket.size ?? null,
        riskDollars: null,
        rewardDollars: null,
        rrMultiple: null,
        riskDecision: DEFAULT_RISK_DECISION,
        canonicalApproved: buildCanonicalApprovedTicketView(ticket) ?? null,
      })),
    });
  });
}
