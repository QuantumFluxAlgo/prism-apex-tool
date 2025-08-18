import Fastify from 'fastify';
import cors from '@fastify/cors';
import { marketRoutes } from './routes/market';
import { signalRoutes } from './routes/signals';
import { rulesRoutes } from './routes/rules';
import { reportRoutes } from './routes/report';
import { ingestRoutes } from './routes/ingest';
import { alertsRoutes } from './routes/alerts';

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

  return app;
}
