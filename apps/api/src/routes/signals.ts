import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { osbSuggest, vwapFirstTouchSuggest, type Bar } from '@prism-apex-tool/signals';
import { applyGuardrails } from '../lib/guard';

export async function signalRoutes(app: FastifyInstance) {
  const BarSchema = z.object({
    ts: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().optional(),
  });
  const OSBInput = z.object({
    symbol: z.string(),
    session: z.enum(['RTH', 'ETH']),
    bars: z.array(BarSchema).min(10),
  });
  const VWAPInput = z.object({
    symbol: z.string(),
    bars: z.array(BarSchema).min(10),
  });

  app.post('/signals/osb', async (req, reply) => {
    const p = OSBInput.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });
    const out = osbSuggest(p.data.symbol, p.data.session, p.data.bars as Bar[]);
    const first = out.suggestions[0];
    const guard: ReturnType<typeof applyGuardrails> = first
      ? applyGuardrails({
          symbol: first.symbol,
          side: first.side === 'BUY' ? 'long' : 'short',
          entry: first.entry,
          stop: first.stop,
          target: first.targets[0]!,
        })
      : { accepted: false, reasons: ['no suggestion'] };
    if (!guard.accepted) {
      app.log.warn({
        reasons: guard.reasons,
        rr: guard.rr,
        route: '/signals/osb',
        symbol: first?.symbol,
        side: first?.side,
      }, 'guard reject');
    }
    return { ...out, guard };
  });

  app.post('/signals/vwap-first-touch', async (req, reply) => {
    const p = VWAPInput.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });
    const out = vwapFirstTouchSuggest(p.data.symbol, p.data.bars as Bar[]);
    const first = out.suggestions[0];
    const guard: ReturnType<typeof applyGuardrails> = first
      ? applyGuardrails({
          symbol: first.symbol,
          side: first.side === 'BUY' ? 'long' : 'short',
          entry: first.entry,
          stop: first.stop,
          target: first.targets[0]!,
        })
      : { accepted: false, reasons: ['no suggestion'] };
    if (!guard.accepted) {
      app.log.warn({
        reasons: guard.reasons,
        rr: guard.rr,
        route: '/signals/vwap-first-touch',
        symbol: first?.symbol,
        side: first?.side,
      }, 'guard reject');
    }
    return { ...out, guard };
  });

  app.get('/signals/ping', async () => ({ ok: true }));
}
export default signalRoutes;
