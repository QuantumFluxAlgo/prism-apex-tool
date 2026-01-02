import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getLiveness, getReadiness } from '../services/health.js';

export const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/', async () => ({ ok: true }));
  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/health/live', async (request, reply) => {
    const status = getLiveness();
    const httpStatus = status.status === 'ok' ? 200 : 500;
    reply.code(httpStatus);
    return status;
  });

  app.get('/health/ready', async (request, reply) => {
    const status = getReadiness();
    const httpStatus = status.status === 'ok' ? 200 : status.status === 'degraded' ? 503 : 500;
    reply.code(httpStatus);
    return status;
  });
};

export default healthRoutes;
