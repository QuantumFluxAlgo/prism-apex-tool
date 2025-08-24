import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { store } from '../store';

export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.get('/report/daily', async (req, reply) => {
    const q = z
      .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid date' });
    const report = store.buildDailyReport(q.data.date);
    return report;
  });
};

export default reportRoutes;
