import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { applyGuardrails } from '../lib/guard';
import { store } from '../store';
import { alertSchema } from '../schemas/alert';
import type { TicketInput } from '@prism-apex-tool/rules-apex';

const TicketInputSchema = z.object({
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  entry: z.number(),
  stop: z.number(),
  target: z.number(),
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

    const ticket: TicketInput = {
      symbol: p.data.symbol,
      side: p.data.side === 'BUY' ? 'long' : 'short',
      entry: p.data.entry,
      stop: p.data.stop,
      target: p.data.target,
      timestampUtc: p.data.timestampUtc,
      meta: p.data.meta,
    };

    const guard = applyGuardrails(ticket);
    if (!guard.accepted) {
      app.log.warn({
        reasons: guard.reasons,
        rr: guard.rr,
        route: '/ingest/alert',
        symbol: p.data.symbol,
        side: p.data.side,
      }, 'guard reject');
      return reply.code(422).send({ accepted: false, rr: guard.rr, reasons: guard.reasons });
    }

    let entry;
    if (p.data.alert && p.data.human) {
      entry = store.enqueueAlert({ alert: p.data.alert, human: p.data.human } as any);
    }
    return { ok: true, accepted: true, rr: guard.rr, alert: entry };
  });
};

export default ingestRoutes;
