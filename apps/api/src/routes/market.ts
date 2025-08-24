import type { FastifyInstance } from 'fastify';

export async function marketRoutes(app: FastifyInstance) {
  app.get('/market/symbols', async () => ({ symbols: ['ES', 'NQ', 'MES', 'MNQ'] }));
  app.get('/market/sessions', async () => ({
    RTH: { start: '13:30', end: '20:00', tz: 'UTC' },
    ETH: { start: '22:00', end: '21:00', tz: 'UTC' },
  }));
}
export default marketRoutes;
