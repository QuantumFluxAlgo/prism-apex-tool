import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { listTickets, exportTickets } from '../store/tickets.js';
import { guardSuggestion } from '../jobs/ticketizer.js';
import { loadRegistry } from '@prism-apex/config';
import { getConfig } from '../config/env.js';
import { TICKET_STRATEGIES } from '../schemas/ticket.js';

export async function ticketsRoutes(app: FastifyInstance) {
  app.get('/tickets', async (req, reply) => {
    const q = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        cursor: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
        strategy: z.enum(TICKET_STRATEGIES).optional(),
      })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    const limit = Math.min(Math.max(q.data.limit ?? 50, 1), 200);
    const { items, nextCursor } = listTickets(q.data.date, q.data.cursor, limit, ((q.data.strategy==='ORR'||q.data.strategy==='Open Range Retest (ORR)')?'APX-DDB-01':q.data.strategy));
    return { tickets: items, nextCursor: nextCursor ?? null };
  });

  app.get('/export/tickets', async (req, reply) => {
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    const rows = exportTickets(q.data.date);
    const header = [
      'symbol',
      'side',
      'entry',
      'stop',
      'target',
      'qty',
      'accountId',
      'timestampUtc',
      'meta.strategy',
      'meta.rr',
      'accepted',
      'reasons',
    ].join(',');
    const csv = [
      header,
      ...rows.map((t) =>
        [
          t.symbol,
          t.side,
          t.entry,
          t.stop,
          t.target,
          t.qty,
          t.accountId,
          t.timestampUtc,
          t.meta.strategy,
          t.meta.rr,
          t.accepted,
          (t.reasons || []).join('|'),
        ].join(','),
      ),
    ].join('\n');
    return reply.type('text/csv').send(csv);
  });

  app.post('/tickets/debug-replay', async (req, reply) => {
    const p = z.array(z.any()).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });
    const registry = loadRegistry();
    const acct = registry.accounts[0];
    const cfg = getConfig();
    const tickets = p.data.map((s: any) =>
      guardSuggestion(s, {
        accountId: acct.id,
        phase: acct.phase as 'eval' | 'funded',
        maxContracts: acct.maxContracts,
        bufferCleared: acct.bufferCleared,
        recentSizes: [],
        flatByUtc: cfg.time.flatByUtc,
      }),
    );
    return tickets;
  });
}

export default ticketsRoutes;
