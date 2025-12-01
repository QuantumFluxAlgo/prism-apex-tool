import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getOperatorConfig, upsertOperatorConfig } from '../store/operatorConfig.js';

const PutBodySchema = z
  .object({
    dailyStartingBalance: z.union([z.number().positive().finite(), z.null()]).optional(),
    maxDailyDrawdownPct: z.union([z.number().positive().finite().max(100), z.null()]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Payload must include at least one field',
  });

export const operatorConfigRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/operator-config', async () => {
    return getOperatorConfig();
  });

  app.put('/api/operator-config', async (request, reply) => {
    const parsed = PutBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload' });
    }
    try {
      const updated = await upsertOperatorConfig(parsed.data);
      return updated;
    } catch (error) {
      app.log.warn({ err: error }, 'operator-config upsert failed');
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Invalid payload' });
    }
  });
};

export default operatorConfigRoutes;
