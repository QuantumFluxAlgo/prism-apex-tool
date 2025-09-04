import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { getHealth } from '@prism-apex-tool/runtime';

const DISABLE = process.env.DISABLE_JOBS === '1' || process.env.NODE_ENV === 'test';
const plugin: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  app.get('/ready', async (_req, reply) => {
  const health = getHealth();
  const mgr = new Set(['FEED','STRATEGIES','TICKETIZER','TELEMETRY','EOD_FLAT']);
  let jobs = health.jobs;
  if (DISABLE) {
    const filtered: Record<string, { lastBeatIso: string; healthy: boolean }> = {};
    for (const [name, st] of Object.entries(jobs)) {
      if (!mgr.has(name)) filtered[name] = st;
    }
    jobs = filtered;
  }
  const vals = Object.values(jobs);
  const overall = vals.length === 0 ? 'degraded' : (vals.every(j => j.healthy) ? 'healthy' : 'degraded');
  reply.code(200).send({ jobs, overall, ...(DISABLE ? { note: 'manager jobs disabled in dev' } : {}) });
});
  done();
};

export default plugin;
