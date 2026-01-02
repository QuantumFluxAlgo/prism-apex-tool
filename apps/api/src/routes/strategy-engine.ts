import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { enginePreviewRequestSchema } from '../dto/strategy-engine/index.js';
import { runEnginePreview } from '../services/strategy-engine/index.js';

export const strategyEngineRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/api/strategy-engine/preview', async (request, reply) => {
    try {
      const parsed = enginePreviewRequestSchema.parse(request.body);
      const result = await runEnginePreview(parsed);
      return reply.send(result);
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Invalid engine preview request',
          details: err.errors ?? undefined,
        });
      }
      request.log.error({ err }, 'engine preview failed');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default strategyEngineRoutes;
