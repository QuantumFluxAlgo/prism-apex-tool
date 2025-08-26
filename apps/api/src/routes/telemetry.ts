import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getAccount, getPositions, getFills } from '../store/telemetry.js';

export const telemetryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/telemetry/positions', async (req, reply) => {
    const q = z.object({ accountId: z.string().min(1) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    return getPositions(q.data.accountId);
  });
  app.get('/telemetry/account', async (req, reply) => {
    const q = z.object({ accountId: z.string().min(1) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    const acct = getAccount(q.data.accountId);
    if (!acct) return reply.code(404).send({ error: 'Not found' });
    return acct;
  });
  app.get('/telemetry/fills', async (req, reply) => {
    const q = z
      .object({
        accountId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    return getFills(q.data.accountId, q.data.date);
  });
};

export default telemetryRoutes;
