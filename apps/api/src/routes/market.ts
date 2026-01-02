import type { FastifyInstance } from 'fastify';
import { getDisplaySymbol, getMarketSymbols } from './market-utils.js';

export async function marketRoutes(app: FastifyInstance) {
  const prefixes = ['/market', '/api/market'] as const;
  const symbols = getMarketSymbols().map((sym) => getDisplaySymbol(sym));

  for (const prefix of prefixes) {
    app.get(`${prefix}/symbols`, async () => ({ symbols }));
    app.get(`${prefix}/sessions`, async () => ({
      RTH: {
        start: process.env.SESSION_OPEN_UTC ?? '14:30',
        end: process.env.SESSION_CLOSE_UTC ?? '21:00',
        tz: 'UTC',
      },
    }));
  }
}
export default marketRoutes;
