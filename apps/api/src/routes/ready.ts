import type { FastifyInstance } from 'fastify';
import { getHealth } from '@prism-apex-tool/runtime';

export async function readyRoutes(app: FastifyInstance) {
  app.get('/ready', async () => getHealth());
}

export default readyRoutes;
