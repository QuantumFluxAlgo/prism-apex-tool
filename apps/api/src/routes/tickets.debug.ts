import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { loadRegistry } from '@prism-apex/config';
import { guardSuggestion, type Suggestion } from '../jobs/ticketizer.js';
import { getConfig } from '../config/env.js';
import { getRecentTicketSizes } from '../store/tickets.js';
import { isTestMode } from '../utils/testMode.js';
import { appendTickets, type MockTicket } from '../utils/mockStore.js';

type BarReplayBody = {
  symbol: string;
  strategy: string;
  bars: Array<{ t: string; o: number; h: number; l: number; c: number; v?: number }>;
};

type DebugReplayRequest = FastifyRequest<{ Body: Suggestion[] | BarReplayBody }>;

function toMockTicketsFromSuggestions(payload: Suggestion[], tickets: any[]): MockTicket[] {
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

      return reply.send(tickets);
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
    return reply.send({ added: tickets.length, tickets });
  });
}
