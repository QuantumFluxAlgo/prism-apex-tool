import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth.js';
import rateLimit from './plugins/rateLimit.js';
import { marketRoutes } from './routes/market.js';
import { signalRoutes } from './routes/signals.js';
import { rulesRoutes } from './routes/rules.js';
import { reportRoutes } from './routes/report.js';
import { reportConsistencyRoutes } from './routes/report.consistency.js';
import { ingestRoutes } from './routes/ingest.js';
import { alertsRoutes } from './routes/alerts.js';
import { notifyRoutes } from './routes/notify.js';
import { jobsRoutes } from './routes/jobs.js';
import { compatRoutes } from './routes/compat.js';
import healthRoute from './routes/health.js';
import versionRoute from './routes/version.js';
import { analyticsRoutes } from './routes/analytics.js';
import { auditRoutes } from './routes/audit.js';
import { accountsRoutes } from './routes/accounts.js';
import yahooHealthRoutes from './routes/health.yahoo.js';
import { exportRoutes } from './routes/export.js';
import ticketsRoute from './routes/tickets.js';
import ticketCompleteRoute from './routes/ticket.complete.js';
import { tradingviewWebhookRoutes } from './routes/webhooks.tradingview.js';
import readyRoute from './routes/ready.js';
import { getConfig } from './config/env.js';
import jobsBoot from './jobs/boot.js';
import strategyAlias from './plugins/strategy-alias.js';
import metricsRoute from './routes/metrics.js';
import symbolsRoute from './routes/symbols.js';
import statusRoute from './routes/status.js';

const cfg = getConfig();

import { telemetryRoutes } from './routes/telemetry.js';
import { openapiRoutes } from './routes/openapi.js';
import { jobManager } from './lib/jobManager.js';

import { registerStrategiesJob } from './jobs/strategies.js';
import { registerTicketizerJob } from './jobs/ticketizer.js';
import { registerTelemetryJob } from './jobs/telemetry.js';
import { registerEodFlatJob } from './jobs/eodFlat.js';

import { registerJob, startJobs, stopJobs } from './jobs/scheduler.js';
import { jobMissingBrackets } from './jobs/missingBrackets.js';
import { jobDailyLoss } from './jobs/dailyLoss.js';
import { jobConsistency } from './jobs/consistency.js';
import { runTicketsDiskSyncJob } from './jobs/ticketsDiskSync.js';

const DISABLE = process.env.DISABLE_JOBS === '1' || process.env.NODE_ENV === 'test';

export function buildServer() {
  const trustProxy = String(process.env.TRUST_PROXY ?? '').toLowerCase() === 'true';
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      // redact common secret locations; avoid logging raw auth headers or passwords
      redact: [
        'req.headers.authorization',
        'headers.authorization',
        'req.headers["x-webhook-secret"]',
        'headers["x-webhook-secret"]',
        'password',
        'token',
        'authorization',
      ],
    },
    requestTimeout: cfg.requestTimeoutMs,
    keepAliveTimeout: cfg.keepAliveTimeoutMs,
    bodyLimit: cfg.bodyLimitBytes,
    trustProxy,
  });
  // Normalize strategy aliases (e.g., ORR -> APX-DDB-01)
  app.register(strategyAlias);
  app.log.info(
    {
      config: {
        minRR: cfg.guardrails.minRR,
        maxRR: cfg.guardrails.maxRR,
        flatByUtc: cfg.time.flatByUtc,
        sizePolicy: cfg.sizing.policy,
        percentNoBuffer: cfg.sizing.percent.noBuffer,
        percentWithBuffer: cfg.sizing.percent.withBuffer,
        consistency: {
          enabled: cfg.consistency.enabled,
          dayShareLimit: cfg.consistency.dayShareLimit,
          enforce: cfg.consistency.enforce,
        },
      },
    },
    'config summary',
  );
  app.register(cors, { origin: true });
  
// Public paths (no auth/rate-limit)
  const publicPaths = [
    '/health',
    '/ready',
    '/status',
    '/api/status',
    '/openapi.json',
    '/version',
    '/webhooks/tradingview',
  ];

  app.register(authPlugin, { publicPaths });
  app.register(rateLimit, { publicPaths });

  app.register(readyRoute);
  app.register(healthRoute);
  app.register(statusRoute);
  
  app.register(ticketsRoute);
  app.register(ticketCompleteRoute);
  app.register(metricsRoute);
  app.register(analyticsRoutes);
  app.register(auditRoutes);
  app.register(accountsRoutes);
  app.register(yahooHealthRoutes);
  app.register(exportRoutes);

  app.register(marketRoutes);
  app.register(signalRoutes);
  app.register(rulesRoutes);
  app.register(reportRoutes);
  app.register(reportConsistencyRoutes);
  app.register(ingestRoutes);
  app.register(alertsRoutes);
  app.register(notifyRoutes);
  app.register(jobsRoutes);
  app.register(compatRoutes, { prefix: '/compat' });
  app.register(telemetryRoutes);
  app.register(tradingviewWebhookRoutes, { prefix: '/webhooks' });
  app.register(jobsBoot);
  app.register(symbolsRoute);
  // ---- Jobs ----
  registerStrategiesJob();
  registerTicketizerJob();
  registerTelemetryJob();
  registerEodFlatJob();
  registerJob('MISSING_BRACKETS', 15_000, jobMissingBrackets);
  registerJob('DAILY_LOSS', 60_000, jobDailyLoss);
  registerJob('CONSISTENCY', 300_000, jobConsistency);
  registerJob('DISK_TICKETS_SYNC', 30_000, () => runTicketsDiskSyncJob(app.log));

  if (!DISABLE) {
    jobManager.startAll().catch((err) => app.log.error({ err }, 'job start failed'));
    startJobs();
  }
  app.addHook('onClose', async () => {
    stopJobs();
    await jobManager.stopAll();
  });
  app.register(openapiRoutes);

  return app;
}
