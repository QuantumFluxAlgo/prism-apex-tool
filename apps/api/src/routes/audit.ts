import type { FastifyInstance } from 'fastify';
import { readEventsFromLines } from '@prism-apex-tool/audit';

export async function auditRoutes(app: FastifyInstance) {
  app.get('/audit/last', async () => {
    const lines = [
      '{"event_type":"TICKET","details":{"id":1}}',
      '{"event_type":"PANIC","details":{"reason":"test"}}',
    ];
    const events = readEventsFromLines(lines);
    return { last: events.at(-1) ?? null };
  });
}
