import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getConfig } from '../config/env.js';
import { evaluateCandidate } from '../lib/guard.js';
import { store } from '../store.js';
import { alertSchema } from '../schemas/alert.js';
import type { ParseResult } from '../types.js';
import { ctEqual } from '../lib/ctEqual.js';

export function normalizeSymbol(sym: string): string {
  return sym.replace(/\d+!$/, '');
}

const rawPayload = z.object({
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  entry: z.coerce.number(),
  stop: z.coerce.number(),
  target: z.coerce.number(),
  qty: z.coerce.number().int().positive().optional(),
  accountId: z.string().optional(),
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
    const p = parsed.data as typeof parsed.data & { accountId?: string; qty?: number };
    const decision = await evaluateCandidate({
      symbol: normalizeSymbol(p.symbol),
      contract: p.symbol,
      direction: p.side,
      entry: p.entry,
      stop: p.stop,
      target: p.target,
      qty: p.qty,
      accountId: p.accountId,
      strategy: typeof p.meta?.strategy === 'string' ? p.meta.strategy : undefined,
    });
    if (!decision.allowed) {
      req.log.warn({ codes: decision.codes }, 'tradingview webhook rejected');
      return reply.code(422).send({
        accepted: false,
        decision,
      });
    }

    let queuedId: string | undefined;
    const maybeAlert = alertSchema.safeParse(req.body);
    if (maybeAlert.success) {
      queuedId = store.enqueueAlert(maybeAlert.data as ParseResult).id;
    }

    return reply.code(202).send({
      accepted: true,
      decision,
      queuedId,
    });
  });
}
