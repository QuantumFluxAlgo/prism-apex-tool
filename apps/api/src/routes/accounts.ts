import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Accounts } from '../lib/accounts.js';

const ParamsSchema = z.object({ id: z.string().min(1) });
const BodySchema = z.object({
  name: z.string().optional(),
  accountId: z.number().int().positive().optional(),
  accountSpec: z.string().optional(),
  mode: z.enum(['eval','funded']).optional(),
  planMaxContracts: z.number().int().positive().optional(),
  maxContracts: z.number().int().positive().optional(), // legacy alias
  baseSize: z.number().int().positive().optional(),
  multiplier: z.number().int().positive().optional(),
  minQty: z.number().int().positive().optional(),
  notes: z.string().optional(),
  bufferCleared: z.boolean().optional()
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
    const payload: any = b.data;
    const acct = await Accounts.upsert({
      id: p.data.id,
      ...payload,
      planMaxContracts: payload.planMaxContracts ?? payload.maxContracts
    });
    app.log.info({ id: p.data.id, updated: b.data }, 'account upsert');
    return acct;
  });
};

export default accountsRoutes;
