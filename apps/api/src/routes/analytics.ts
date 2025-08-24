import type { FastifyInstance } from 'fastify';
import { generateSummary } from '@prism-apex-tool/analytics';

export async function analyticsRoutes(app: FastifyInstance) {
  app.get('/analytics/summary', async () => {
    const events = [
      { pnl: 1000, fees: 50, type: 'TRADE' },
      { pnl: 500, fees: 25, type: 'PANIC' },
    ];
    return generateSummary(events, new Date('2025-01-02'));
  });
}
