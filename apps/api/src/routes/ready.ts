import { getHealth } from '@prism-apex/runtime';
import { FastifyInstance, FastifyPluginCallback } from 'fastify';

type JobStatus = { lastBeatIso: string; healthy: boolean };

const DISABLE = process.env.DISABLE_JOBS === '1' || process.env.NODE_ENV === 'test';

const plugin: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  app.get('/ready', async (_req, reply) => {
    const health = getHealth();
    const mgr = new Set(['FEED', 'STRATEGIES', 'TICKETIZER', 'TELEMETRY', 'EOD_FLAT']);
    let jobs: Record<string, JobStatus> = health.jobs;

    if (DISABLE) {
      const filtered: Record<string, JobStatus> = {};
      for (const [name, st] of Object.entries(jobs)) {
        if (!mgr.has(name)) filtered[name] = st;
      }
      jobs = filtered;
    }

    const vals = Object.values(jobs);
    const overall: 'healthy' | 'degraded' = vals.length > 0 && vals.every(j => j.healthy) ? 'healthy' : 'degraded';

    reply.code(200).send({ jobs, overall, ...(DISABLE ? { note: 'manager jobs disabled in dev' } : {}) });
  });
  done();
};

export default plugin;
