import type { FastifyInstance } from 'fastify';
import { marketFeed } from '../jobs/feed.js';
import { strategies } from '../jobs/strategies.js';
import { ticketizer } from '../jobs/ticketizer.js';

export async function readyRoutes(app: FastifyInstance) {
  app.get('/ready', async () => ({ ok: true, marketFeed, strategies, ticketizer }));
}
export default readyRoutes;
