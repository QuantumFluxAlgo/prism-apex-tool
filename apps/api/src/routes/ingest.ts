import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { evaluateCandidate } from '../lib/guard.js';
import { store } from '../store.js';
import { alertSchema } from '../schemas/alert.js';

const TicketInputSchema = z.object({
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  entry: z.number(),
  stop: z.number(),
  target: z.number(),
  qty: z.number().int().positive().optional(),
  accountId: z.string().optional(),
  timestampUtc: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

const PayloadSchema = TicketInputSchema.extend({
  alert: alertSchema.shape.alert.optional(),
  human: alertSchema.shape.human.optional(),
});

export const ingestRoutes: FastifyPluginAsync = async (app) => {
  app.post('/ingest/alert', async (req, reply) => {
    const p = PayloadSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });

    const decision = await evaluateCandidate({
      symbol: p.data.symbol,
      contract: p.data.symbol,
      direction: p.data.side,
      entry: p.data.entry,
      stop: p.data.stop,
      target: p.data.target,
      qty: p.data.qty,
      accountId: p.data.accountId,
      strategy: typeof p.data.meta?.strategy === 'string' ? p.data.meta.strategy : undefined,
    });
    if (!decision.allowed) {
      app.log.warn(
        {
          reasons: decision.codes,
          route: '/ingest/alert',
          symbol: p.data.symbol,
          side: p.data.side,
        },
        'guard reject',
      );
      return reply
        .code(422)
        .send({ accepted: false, decision });
    }

    let entry;
    if (p.data.alert && p.data.human) {
      entry = store.enqueueAlert({ alert: p.data.alert, human: p.data.human } as any);
    }
    return { ok: true, accepted: true, decision, alert: entry };
  });
};

export default ingestRoutes;
