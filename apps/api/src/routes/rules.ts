import { FastifyPluginAsync } from 'fastify';
import { checkCompliance } from '../services/rules/engine';
import { accountStateSchema } from '../schemas/accountState';

export const rulesRoutes: FastifyPluginAsync = async (app) => {
  app.post('/rules/check', async (req, reply) => {
    const p = accountStateSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });
    return checkCompliance(p.data as any);
  });
};

export default rulesRoutes;
