import { FastifyPluginAsync } from 'fastify';
import { store } from '../store';
import { alertSchema } from '../schemas/alert';

export const ingestRoutes: FastifyPluginAsync = async (app) => {
  app.post('/ingest/alert', async (req, reply) => {
    const p = alertSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });
    const entry = store.enqueueAlert(p.data as any);
    return { ok: true, alert: entry };
  });
};

export default ingestRoutes;
