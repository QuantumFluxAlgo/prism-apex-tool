import { FastifyPluginAsync } from 'fastify';
import { accountStateSchema } from '../schemas/accountState';
import { checkCompliance } from '../services/rules/engine';

export const rulesRoutes: FastifyPluginAsync = async (app) => {
  app.post('/rules/check', async (req, reply) => {
    const body = accountStateSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid state' });
    const result = checkCompliance(body.data as any);
    return result;
  });
};

export default rulesRoutes;
