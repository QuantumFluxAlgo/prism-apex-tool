import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { store } from '../store.js';
import { PromoteInput } from '../schemas/ticketsPromote.js';
import { applyGuardWithSizing } from '@prism-apex-tool/rules-apex';

export async function ticketsRoutes(app: FastifyInstance) {
  app.post('/tickets/promote', async (req, reply) => {
    const p = PromoteInput.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });

    const { suggestion } = p.data;

    const accountPhase = process.env.ACCOUNT_PHASE === 'funded' ? 'funded' : 'eval';
    const bufferCleared = false;
    const today = new Date().toISOString().slice(0, 10);
    const recent = store.getTicketsForDate(today).map(t => (t.ticket as any).qty);

    const result = applyGuardWithSizing(
      {
        symbol: suggestion.symbol,
        side: suggestion.side,
        entry: suggestion.entry,
        stop: suggestion.stop,
        qty: suggestion.qty,
        strategy: (suggestion.meta as any)?.strategy || 'VWAP_FT',
        target: suggestion.targets[0],
      },
      {
        phase: accountPhase,
        account: { id: 'A1', maxContracts: Number(process.env.APEX_MAX_CONTRACTS || 5) },
        bufferCleared,
        recentSizes: recent,
        contract: suggestion.symbol,
      },
    );

    if (!result.accepted) {
      return reply.code(400).send({ error: 'Guardrails', reasons: result.reasons });
    }

    const ticket = result.ticket!;
    store.appendTicket({
      when: ticket.timestampUtc,
      ticket: { id: suggestion.id, ...ticket } as any,
      reasons: p.data.reasons ?? [],
    });

    return { ok: true, ticket };
  });

  app.get('/tickets', async (req, reply) => {
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid date' });
    const rows = store.getTicketsForDate(q.data.date);
    return rows;
  });
}
export default ticketsRoutes;
