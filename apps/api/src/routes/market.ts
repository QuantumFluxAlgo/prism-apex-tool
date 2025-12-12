import type { FastifyInstance } from 'fastify';

export async function marketRoutes(app: FastifyInstance) {
  const prefixes = ['/market', '/api/market'] as const;

  for (const prefix of prefixes) {
    app.get(`${prefix}/symbols`, async () => ({ symbols: ['ES', 'NQ', 'MES', 'MNQ'] }));
    app.get(`${prefix}/sessions`, async () => ({
      RTH: { start: '13:30', end: '20:00', tz: 'UTC' },
      ETH: { start: '22:00', end: '21:00', tz: 'UTC' },
    }));
  }
}
export default marketRoutes;
