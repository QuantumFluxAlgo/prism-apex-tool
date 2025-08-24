import type { FastifyInstance } from 'fastify';
import { listJobStatus, runJobNow } from '../jobs/scheduler';

export async function jobsRoutes(app: FastifyInstance) {
  app.get('/jobs/status', async () => listJobStatus());
  app.post<{ Params: { name: string } }>('/jobs/run/:name', async (req, reply) => {
    const ok = await runJobNow(req.params.name);
    if (!ok) return reply.code(404).send({ error: 'Unknown or running' });
    return { ok: true };
  });
}
export default jobsRoutes;
