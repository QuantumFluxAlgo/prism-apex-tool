import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Accounts } from '../lib/accounts.js';

const ParamsSchema = z.object({ id: z.string().min(1) });
const BodySchema = z.object({
  maxContracts: z.number().positive().optional(),
  bufferCleared: z.boolean().optional(),
  notes: z.string().optional(),
});

export const accountsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/accounts', async (_req, _reply) => {
    return Accounts.list();
  });

  app.get('/accounts/:id', async (req, reply) => {
    const p = ParamsSchema.safeParse(req.params);
    if (!p.success) return reply.code(400).send({ error: 'Invalid id' });
    const acct = await Accounts.get(p.data.id);
    if (!acct) return reply.code(404).send({ error: 'Not found' });
    return acct;
  });

  app.put('/accounts/:id', async (req, reply) => {
    const p = ParamsSchema.safeParse(req.params);
    if (!p.success) return reply.code(400).send({ error: 'Invalid id' });
    const b = BodySchema.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'Invalid payload' });
    const acct = await Accounts.upsert({ id: p.data.id, ...b.data });
    app.log.info({ id: p.data.id, updated: b.data }, 'account upsert');
    return acct;
  });
};

export default accountsRoutes;
