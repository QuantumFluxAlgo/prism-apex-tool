import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { parseTradingViewPayload } from '../../../../packages/adapters-tradingview/src/parser';
import { store } from '../store';

const SecretHeader = 'x-webhook-secret';
const SigHeader = 'x-signature'; // expects 'sha256=HEX'

function verifyHmac(raw: string, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;
  const [algo, sigHex] = signatureHeader.split('=');
  if (algo !== 'sha256' || !sigHex) return false;
  const mac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sigHex, 'hex'), Buffer.from(mac, 'hex')); }
  catch { return false; }
}

export async function ingestRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    // Require JSON
    if ((req.headers['content-type'] || '').indexOf('application/json') === -1) {
      // Let Fastify parse JSON since we registered default parsers; fallback safe
    }
  });

  app.post('/ingest/tradingview', { config: { rawBody: true } }, async (req, reply) => {
    const secretEnv = process.env.TRADINGVIEW_WEBHOOK_SECRET || '';
    if (!secretEnv) return reply.code(500).send({ error: 'Server not configured (missing TRADINGVIEW_WEBHOOK_SECRET)' });

    const givenSecret = String(req.headers[SecretHeader] || '');
    if (givenSecret !== secretEnv) return reply.code(401).send({ error: 'Unauthorized' });

    // Optional HMAC
    const hmacSecret = process.env.TRADINGVIEW_HMAC_SECRET;
    if (hmacSecret) {
      // @ts-ignore fastify rawBody if enabled by serializer/ajv plugin; fallback stringify
      const rawBody: string = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body || {});
      const ok = verifyHmac(rawBody, req.headers[SigHeader] as string | undefined, hmacSecret);
      if (!ok) return reply.code(401).send({ error: 'Invalid signature' });
    }

    // Validate body (allow any JSON)
    const body = req.body as unknown;
    const receivedAt = new Date().toISOString();
    const { alert, human, candidate } = parseTradingViewPayload(body, receivedAt);

    const queued = store.enqueueAlert({ alert, human, candidate });
    return reply.send({ ok: true, queued });
  });
}
