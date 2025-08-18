import type { FastifyInstance } from 'fastify';
import { listJobStatus } from '../jobs/scheduler';
import { store } from '../store';

export async function jobsRoutes(app: FastifyInstance) {
  app.get('/jobs/status', async () => {
    return {
      jobs: listJobStatus(),
      flags: {
        ocoMissing: store.getOcoMissing(),
      },
    };
  });
}
