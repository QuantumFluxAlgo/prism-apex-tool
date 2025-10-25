import type { FastifyInstance, FastifyRequest } from 'fastify';
import { guardSuggestion, type Suggestion } from '../jobs/ticketizer.js';
import { loadRegistry } from '@prism-apex/config';
import { getConfig } from '../config/env.js';
import { getRecentTicketSizes } from '../store/tickets.js';

type DebugReplayRequest = FastifyRequest<{ Body: Suggestion[] }>;

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
    const payload = Array.isArray(req.body) ? req.body : [];
    const ctx = {
      accountId: account.id,
      phase: (account.phase as 'eval' | 'funded') ?? 'funded',
      maxContracts: account.maxContracts ?? 1,
      bufferCleared: account.bufferCleared ?? true,
      recentSizes: getRecentTicketSizes(account.id),
      flatByUtc: cfg.time.flatByUtc,
    };
    const tickets = payload.map((suggestion) => guardSuggestion(suggestion, ctx));
    return reply.send(tickets);
  });
}
