import type { FastifyInstance } from 'fastify';
import { marketFeed } from '../jobs/feed.js';

export async function readyRoutes(app: FastifyInstance) {
  app.get('/ready', async () => ({ ok: true, marketFeed }));
}
export default readyRoutes;
