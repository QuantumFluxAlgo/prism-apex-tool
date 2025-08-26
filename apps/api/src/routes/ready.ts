import type { FastifyInstance } from 'fastify';
import { getReadySnapshot } from '../lib/readiness.js';

export async function readyRoutes(app: FastifyInstance) {
  app.get('/ready', async () => getReadySnapshot(app, { includeDefaults: true }));
}
export default readyRoutes;
