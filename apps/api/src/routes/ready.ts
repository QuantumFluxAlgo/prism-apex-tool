import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { getHealth } from '@prism-apex-tool/runtime/health';

const plugin: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  app.get('/ready', async (_req, reply) => {
    const health = getHealth();
    reply.code(200).send(health);
  });
  done();
};

export default plugin;
