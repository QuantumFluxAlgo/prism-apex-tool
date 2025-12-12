import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getAccount, getPositions, getFills } from '../store/telemetry.js';

export const telemetryRoutes: FastifyPluginAsync = async (app) => {
  const prefixes = ['/telemetry', '/api/telemetry'] as const;

  const positionsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const q = z.object({ accountId: z.string().min(1) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    return getPositions(q.data.accountId);
  };

  const accountHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const q = z.object({ accountId: z.string().min(1) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    const acct = getAccount(q.data.accountId);
    if (!acct) return reply.code(404).send({ error: 'Not found' });
    return acct;
  };

  const fillsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const q = z
      .object({
        accountId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    return getFills(q.data.accountId, q.data.date);
  };

  for (const prefix of prefixes) {
    app.get(`${prefix}/positions`, positionsHandler);
    app.get(`${prefix}/account`, accountHandler);
    app.get(`${prefix}/fills`, fillsHandler);
  }
};

export default telemetryRoutes;
