import { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function openapiRoute(app: FastifyInstance) {
  app.get('/openapi.json', async (_req, reply) => {
    // Explicit CORS for Swagger UI
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    const filePath = join(__dirname, '..', 'openapi.json');
    const json = readFileSync(filePath, 'utf8');
    return reply.type('application/json').send(json);
  });
}
