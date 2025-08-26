import type { FastifyInstance } from 'fastify';
import { getVersion } from '../utils/version.js';

export async function versionRoutes(app: FastifyInstance) {
  app.get('/version', async () => ({ version: getVersion() }));
}
