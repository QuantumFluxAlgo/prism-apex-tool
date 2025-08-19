import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function openapiRoute(app: FastifyInstance) {
  app.get('/openapi.json', async (_req, reply) => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const root = path.resolve(__dirname, '../../../../');
    const yaml = fs.readFileSync(path.join(root, 'api/openapi.yaml'), 'utf8');
    // Lazy convert: for tooling we can serve YAML as text; many tools accept YAML directly.
    // For stricter JSON serving, bring in 'yaml' lib later. MVP: serve YAML string in JSON field.
    return reply.send({ openapi: '3.1.0', yaml });
  });
}
