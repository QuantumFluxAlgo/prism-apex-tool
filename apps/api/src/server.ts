import Fastify from 'fastify';
import cors from '@fastify/cors';
import { marketRoutes } from './routes/market';
import { signalRoutes } from './routes/signals';
import { rulesRoutes } from './routes/rules';
import { reportRoutes } from './routes/report';
import { ingestRoutes } from './routes/ingest';
import { alertsRoutes } from './routes/alerts';
import { exportRoutes } from './routes/export';
import { notifyRoutes } from './routes/notify';
import { jobsRoutes } from './routes/jobs';
import { openapiRoute } from './routes/openapi';

import { registerJob, startJobs } from './jobs/scheduler';
import { jobEodFlat } from './jobs/eodFlat';
import { jobMissingBrackets } from './jobs/missingBrackets';
import { jobDailyLoss } from './jobs/dailyLoss';
import { jobConsistency } from './jobs/consistency';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  app.get('/health', async () => ({ ok: true }));

  app.register(marketRoutes);
  app.register(signalRoutes);
  app.register(rulesRoutes);
  app.register(reportRoutes);
  app.register(ingestRoutes);
  app.register(alertsRoutes);
  app.register(exportRoutes);
  app.register(notifyRoutes);
  app.register(jobsRoutes);
  app.register(openapiRoute);

  // ---- Jobs ----
  registerJob('EOD_FLAT', 60_000, jobEodFlat);          // check every 60s (phased logic within)
  registerJob('MISSING_BRACKETS', 15_000, jobMissingBrackets);
  registerJob('DAILY_LOSS', 60_000, jobDailyLoss);
  registerJob('CONSISTENCY', 300_000, jobConsistency);

  // Defer start to next event loop tick to ensure server initialized
  setTimeout(startJobs, 10);

  return app;
}
