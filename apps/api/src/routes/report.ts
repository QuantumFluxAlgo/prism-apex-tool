import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { store } from '../store';

export async function reportRoutes(app: FastifyInstance) {
  app.get('/report/daily', async (req, reply) => {
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid date' });
    const date = q.data.date || new Date().toISOString().slice(0,10);
    const report = store.buildDailyReport(date);
    return report;
  });
}
