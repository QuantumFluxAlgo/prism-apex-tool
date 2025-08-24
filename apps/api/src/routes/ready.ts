import type { FastifyInstance } from 'fastify';

export async function readyRoutes(app: FastifyInstance) {
  app.get('/ready', async () => ({ ok: true, ready: true }));
}
export default readyRoutes;
