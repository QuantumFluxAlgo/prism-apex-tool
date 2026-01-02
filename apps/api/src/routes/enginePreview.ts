import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  enginePreviewRequestSchema,
  enginePreviewResponseSchema,
  type EnginePreviewRequest,
} from '../dto/strategy-engine/index.js';
import { runEnginePreview } from '../services/strategy-engine/index.js';

export default async function enginePreviewRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  app.post('/preview', async (request, reply) => {
      try {
        const parsed = enginePreviewRequestSchema.parse(request.body) as EnginePreviewRequest;
        const result = await runEnginePreview(parsed);
        return reply.status(200).send(result);
      } catch (err: any) {
        if (err?.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Invalid engine preview request',
            details: err.errors ?? undefined,
          });
        }
        request.log.error(
          {
            err,
            route: 'enginePreview',
          },
          'engine preview failed',
        );
        return reply.status(500).send({ error: 'Engine preview failed' });
      }
    });
}
