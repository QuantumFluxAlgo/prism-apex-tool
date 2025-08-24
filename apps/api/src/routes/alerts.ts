import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { store } from '../store';

export const alertsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/alerts/peek', async (req, reply) => {
    const q = z.object({ limit: z.coerce.number().min(1).max(200).default(50) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    return store.peekAlerts(q.data.limit);
  });

  app.post('/alerts/ack', async (req, reply) => {
    const p = z.object({ id: z.string() }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });
    const ok = store.ackAlert(p.data.id);
    if (!ok) return reply.code(404).send({ error: 'Not found' });
    return { ok: true };
  });
};

export default alertsRoutes;
