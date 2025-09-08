import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getConfig } from '../config/env.js';
import { jobManager } from '../lib/jobManager.js';
// If your JobManager requires explicit registration of jobs, keep this import:
import { FeedJob } from './feed.js';

const jobsBoot: FastifyPluginAsync = async (app: FastifyInstance, _opts) => {
  const cfg = getConfig();

  if (!cfg.jobs.enableFeed) {
    app.log.info('feed job disabled: JOBS_ENABLE_FEED=false');
    return;
  }

  try {
    // Only if your jobManager supports register(); it's a no-op otherwise.
    (jobManager as any).register?.(FeedJob);
  } catch {
    // ok if not required
  }

  app.addHook('onReady', async () => {
    try {
      await jobManager.startAll();
    } catch (err) {
      app.log.error({ err }, 'job start failed');
    }
  });
};

export default jobsBoot;
