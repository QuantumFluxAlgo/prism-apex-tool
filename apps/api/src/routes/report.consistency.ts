import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { computeConsistency } from '@prism-apex-tool/consistency';
import { createMockPnlProvider } from '../services/consistency/mockProvider.js';
import { createTelemetryPnlProvider } from '../services/consistency/provider.telemetry.js';

const provider = process.env.ENABLE_TELEMETRY === 'true'
  ? createTelemetryPnlProvider()
  : createMockPnlProvider();

export const reportConsistencyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/report/consistency', async (req, reply) => {
    const q = z
      .object({
        accountId: z.string().min(1),
        window: z.coerce.number().int().min(1).default(8),
      })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (q.data.window - 1));
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const days = await provider.getDailyNetPnl(q.data.accountId, startStr, endStr);
    const result = computeConsistency(days, { windowDays: q.data.window });
    return { accountId: q.data.accountId, ...result };
  });

  if (process.env.NODE_ENV !== 'production') {
    app.post('/debug/pnl/upsert', async (req, reply) => {
      const body = z
        .object({
          accountId: z.string().min(1),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          net: z.number(),
        })
        .safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: 'Invalid body' });
      // upsert is optional (mock/debug providers); only call when available
      if (typeof (provider as any).upsert === 'function') {
        (provider as any).upsert(body.data.accountId, body.data.date, body.data.net);
      }
      return { ok: true };
    });
  }
};

export default reportConsistencyRoutes;
