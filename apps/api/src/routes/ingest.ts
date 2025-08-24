import { FastifyPluginAsync } from 'fastify';
import { parseResultSchema } from '../schemas/alert';
import { store } from '../store';
import type { ParseResult } from '../types';

export const ingestRoutes: FastifyPluginAsync = async (app) => {
  app.post('/ingest/alert', async (req, reply) => {
    const body = parseResultSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid alert' });
    const stored = store.enqueueAlert(body.data as ParseResult);
    return stored;
  });
};

export default ingestRoutes;
