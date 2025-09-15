import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { computeConsistency, loadDailyPnLFromDisk } from '@prism-apex/metrics/consistency';

const plugin: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  app.get('/report/consistency', async (req, reply) => {
    const q = req.query as { window?: string };
    const w = clamp(parseInt(q?.window ?? '8', 10), 1, 15);

    const data = loadDailyPnLFromDisk();
    if (!data || data.length === 0) {
      return reply.code(204).send();
    }

    const result = computeConsistency(data, w);
    return reply.code(200).send(result);
  });

  done();
};

function clamp(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return 8;
  return Math.max(lo, Math.min(hi, n));
}

export default plugin;
