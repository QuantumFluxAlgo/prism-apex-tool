import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import ticketsDebugRoute from '../routes/tickets.debug.js';

export async function buildTestServerTicketsDebug(): Promise<FastifyInstance> {
  const app = Fastify();
  await ticketsDebugRoute(app);
  return app;
}

