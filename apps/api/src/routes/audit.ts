import type { FastifyInstance } from 'fastify';
import { lastAudit } from '@prism-apex/audit';

export async function auditRoutes(app: FastifyInstance) {
  app.get('/audit/last', async () => {
    return { last: lastAudit() };
  });
}
