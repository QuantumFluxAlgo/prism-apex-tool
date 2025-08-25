import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getConfig } from '../config/env';
import { applyGuardrails } from '../lib/guard';
import type { TicketInput } from '@prism-apex-tool/rules-apex';
import { store } from '../store';
import { alertSchema } from '../schemas/alert';
import type { ParseResult } from '../types';
import { ctEqual } from '../lib/ctEqual';

export function normalizeSymbol(sym: string): string {
  return sym.replace(/\d+!$/, '');
}

const rawPayload = z.object({
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  entry: z.coerce.number(),
  stop: z.coerce.number(),
  target: z.coerce.number(),
  meta: z.record(z.unknown()).optional(),
});

const normalizedPayload = rawPayload.extend({
  timestampUtc: z.string(),
});

const payloadSchema = z.union([normalizedPayload, rawPayload]);

export async function tradingviewWebhookRoutes(app: FastifyInstance) {
  app.post('/tradingview', async (req, reply) => {
    const cfg = getConfig();
    const secret = cfg.webhook.tradingviewSecret;
    if (!secret) {
      return reply.code(422).send({ error: 'webhook disabled: secret not configured' });
    }
    const headerSecret = req.headers['x-webhook-secret'];
    if (typeof headerSecret !== 'string' || !ctEqual(headerSecret, secret)) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid payload' });
    }
    const p = parsed.data;
    const ticket: TicketInput = {
      symbol: normalizeSymbol(p.symbol),
      side: p.side === 'BUY' ? 'long' : 'short',
      entry: p.entry,
      stop: p.stop,
      target: p.target,
      timestampUtc: 'timestampUtc' in p ? p.timestampUtc : undefined,
      meta: p.meta,
    };

    const decision = applyGuardrails(ticket);
    if (!decision.accepted) {
      req.log.warn({ rr: decision.rr, reasons: decision.reasons }, 'tradingview webhook rejected');
      return reply
        .code(422)
        .send({ accepted: false, rr: decision.rr, reasons: decision.reasons });
    }

    let queuedId: string | undefined;
    const maybeAlert = alertSchema.safeParse(req.body);
    if (maybeAlert.success) {
      queuedId = store.enqueueAlert(maybeAlert.data as ParseResult).id;
    }

    const res: { accepted: true; rr: number; queuedId?: string } = {
      accepted: true,
      rr: decision.rr,
    };
    if (queuedId) res.queuedId = queuedId;
    return reply.code(202).send(res);
  });
}
