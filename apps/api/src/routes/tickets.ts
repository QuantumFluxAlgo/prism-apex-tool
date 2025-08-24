import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { store } from '../store.js';
import { PromoteInput } from '../schemas/ticketsPromote.js';

export async function ticketsRoutes(app: FastifyInstance) {
  app.post('/tickets/promote', async (req, reply) => {
    const p = PromoteInput.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });

    const { suggestion } = p.data;
    const when = p.data.when ?? new Date().toISOString();
    const reasons = p.data.reasons ?? [];

    store.appendTicket({
      when,
      ticket: {
        id: suggestion.id,
        symbol: suggestion.symbol,
        side: suggestion.side,
        qty: suggestion.qty,
        entry: suggestion.entry,
        stop: suggestion.stop,
        targets: suggestion.targets,
        apex_blocked: suggestion.apex_blocked ?? false,
        meta: suggestion.meta ?? {},
      } as any,
      reasons,
    });

    return { ok: true, when, id: suggestion.id };
  });

  app.get('/tickets', async (req, reply) => {
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid date' });
    const rows = store.getTicketsForDate(q.data.date);
    return rows;
  });
}
export default ticketsRoutes;
