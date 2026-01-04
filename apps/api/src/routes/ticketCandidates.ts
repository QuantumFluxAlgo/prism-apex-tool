import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { listTicketCandidates } from '../store/ticketCandidates.js';

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  symbol: z.string().optional(),
  strategy: z.string().optional(),
  direction: z.enum(['LONG', 'SHORT']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.coerce.number().int().min(0).optional(),
});

export default async function ticketCandidatesRoutes(app: FastifyInstance) {
  app.get('/ticket-candidates', async (req, reply) => {
    const parsed = querySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid query', issues: parsed.error.issues });
    }
    const { total, rows, nextCursor } = await listTicketCandidates(parsed.data);
    return reply.send({ total, rows, tickets: rows, nextCursor });
  });

  app.get('/api/ticket-candidates', async (req, reply) => {
    const parsed = querySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid query', issues: parsed.error.issues });
    }
    const { total, rows, nextCursor } = await listTicketCandidates(parsed.data);
    return reply.send({ total, rows, tickets: rows, nextCursor });
  });
}
