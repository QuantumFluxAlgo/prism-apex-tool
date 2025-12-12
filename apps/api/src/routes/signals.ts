import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { osbSuggest, vwapFirstTouchSuggest, type Bar } from '@prism-apex/signals';
import { evaluateCandidate, type GuardDecisionDto } from '../lib/guard.js';

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
    const guard: GuardDecisionDto = first
      ? await evaluateCandidate({
          symbol: first.symbol,
          contract: first.symbol,
          direction: first.side,
          entry: first.entry,
          stop: first.stop,
          target: first.targets?.[0],
          strategy: 'OSB',
        })
      : { allowed: false, codes: ['no-suggestion'], warnings: [], reason: 'no suggestion', sizing: null };
    if (!guard.allowed) {
      app.log.warn(
        {
          reasons: guard.codes,
          route: '/signals/osb',
          symbol: first?.symbol,
          side: first?.side,
        },
        'guard reject',
      );
    }
    return { ...out, guard };
  });

  app.post('/signals/vwap-first-touch', async (req, reply) => {
    const p = VWAPInput.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });
    const out = vwapFirstTouchSuggest(p.data.symbol, p.data.bars as Bar[]);
    const first = out.suggestions[0];
    const guard: GuardDecisionDto = first
      ? await evaluateCandidate({
          symbol: first.symbol,
          contract: first.symbol,
          direction: first.side,
          entry: first.entry,
          stop: first.stop,
          target: first.targets?.[0],
          strategy: 'VWAP_FT',
        })
      : { allowed: false, codes: ['no-suggestion'], warnings: [], reason: 'no suggestion', sizing: null };
    if (!guard.allowed) {
      app.log.warn(
        {
          reasons: guard.codes,
          route: '/signals/vwap-first-touch',
          symbol: first?.symbol,
          side: first?.side,
        },
        'guard reject',
      );
    }
    return { ...out, guard };
  });

  app.get('/signals/ping', async () => ({ ok: true }));
}
export default signalRoutes;
