import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { listJobStatus } from '../jobs/scheduler.js';

type SchedulerJobStatusDto = {
  name: string;
  everyMs: number;
  running: boolean;
  lastRunUtc: string | null;
  lastOk: boolean | null;
  lastError: string | null;
  lastDurationMs: number | null;
};

export const systemJobsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/api/system/jobs', async (): Promise<SchedulerJobStatusDto[]> =>
    listJobStatus().map((job) => ({
      name: job.name,
      everyMs: job.everyMs,
      running: job.running,
      lastRunUtc: typeof job.lastRun === 'number' ? new Date(job.lastRun).toISOString() : null,
      lastOk: typeof job.lastOk === 'boolean' ? job.lastOk : null,
      lastError: job.lastError ?? null,
      lastDurationMs: typeof job.lastDurationMs === 'number' ? job.lastDurationMs : null,
    })),
  );
};

export default systemJobsRoutes;
