import type { FastifyInstance } from 'fastify';
export default async function healthRoute(app: FastifyInstance) {
  app.get('/', async () => ({ ok: true }));
  app.get('/health', async () => ({ status: 'ok' }));
}
