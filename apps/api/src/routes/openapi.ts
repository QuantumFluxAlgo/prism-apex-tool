import type { FastifyInstance } from 'fastify';
import { buildOpenApi } from '../openapi/spec.js';

export async function openapiRoute(app: FastifyInstance) {
  app.get('/openapi.json', async (_req, reply) => {
    const doc = buildOpenApi();
    return reply.type('application/json').send(doc);
  });
}
export default openapiRoute;
