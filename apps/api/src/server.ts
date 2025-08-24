import Fastify from 'fastify';
import cors from '@fastify/cors';
import { marketRoutes } from './routes/market.js';
import { signalRoutes } from './routes/signals.js';
import { rulesRoutes } from './routes/rules.js';
import { reportRoutes } from './routes/report.js';
import { ingestRoutes } from './routes/ingest.js';
import { alertsRoutes } from './routes/alerts.js';
import { exportRoutes } from './routes/export.js';
import { notifyRoutes } from './routes/notify.js';
import { jobsRoutes } from './routes/jobs.js';
import { openapiRoute } from './routes/openapi.js';
import { compatRoutes } from './routes/compat.js';
import { healthRoutes } from './routes/health.js';
import { versionRoutes } from './routes/version.js';
import { analyticsRoutes } from './routes/analytics.js';
import { auditRoutes } from './routes/audit.js';
import { getConfig } from './config/env';

import { registerJob, startJobs } from './jobs/scheduler';
import { jobEodFlat } from './jobs/eodFlat';
import { jobMissingBrackets } from './jobs/missingBrackets';
import { jobDailyLoss } from './jobs/dailyLoss';
import { jobConsistency } from './jobs/consistency';

export function buildServer() {
  const cfg = getConfig();
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      // redact common secret locations; avoid logging raw auth headers or passwords
      redact: ['req.headers.authorization', 'headers.authorization', 'password', 'token', 'authorization'],
    },
    requestTimeout: cfg.requestTimeoutMs,
    keepAliveTimeout: cfg.keepAliveTimeoutMs,
    bodyLimit: cfg.bodyLimitBytes,
  });

  app.register(cors, { origin: true });

  app.register(healthRoutes);
  app.register(versionRoutes);
  app.register(analyticsRoutes);
  app.register(auditRoutes);

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
  app.register(compatRoutes, { prefix: '/compat' });

  // ---- Jobs ----
  registerJob('EOD_FLAT', 60_000, jobEodFlat); // check every 60s (phased logic within)
  registerJob('MISSING_BRACKETS', 15_000, jobMissingBrackets);
  registerJob('DAILY_LOSS', 60_000, jobDailyLoss);
  registerJob('CONSISTENCY', 300_000, jobConsistency);

  // Defer start to next event loop tick to ensure server initialized
  setTimeout(startJobs, 10);

  return app;
}
