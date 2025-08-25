import type { FastifyInstance } from 'fastify';
import { marketFeed } from '../jobs/feed.js';
import { strategies } from '../jobs/strategies.js';

export async function readyRoutes(app: FastifyInstance) {
  app.get('/ready', async () => ({ ok: true, marketFeed, strategies }));
}
export default readyRoutes;
