import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import path from 'path';

export default async function openapiRoute(app: FastifyInstance) {
  app.get('/openapi.json', async (_req, reply) => {
    const filePath = path.join(__dirname, '..', 'openapi.json');
    const json = readFileSync(filePath, 'utf8');
    reply.type('application/json').send(json);
  });
}
