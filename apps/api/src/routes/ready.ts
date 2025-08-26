import type { FastifyInstance } from 'fastify';
import { marketFeed } from '../jobs/feed.js';
import { strategies } from '../jobs/strategies.js';
import { ticketizer } from '../jobs/ticketizer.js';
import { getStats as ticketStore } from '../store/tickets.js';
import { telemetry } from '../jobs/telemetry.js';
import { jobManager } from '../lib/jobManager.js';

export async function readyRoutes(app: FastifyInstance) {
  app.get('/ready', async () => ({
    ok: true,
    jobs: jobManager.status(),
    marketFeed,
    strategies,
    ticketizer,
    ticketStore: ticketStore(),
    consistency: {
      mode: process.env.CONSISTENCY_ENFORCE === 'true' ? 'preblock' : 'metrics-only',
    },
    telemetry: {
      running: telemetry.running,
      lastSnapshotTs: telemetry.lastSnapshotTs,
      accounts: telemetry.accounts,
      positions: telemetry.positions,
      fillsToday: telemetry.fillsToday,
      bufferCleared: telemetry.bufferCleared,
    },
  }));
}
export default readyRoutes;
