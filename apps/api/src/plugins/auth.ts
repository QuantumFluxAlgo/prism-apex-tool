import fp from 'fastify-plugin';
import type { FastifyRequest, FastifyReply } from 'fastify';

type Opts = { publicPaths?: (string | RegExp)[] };

function isPublicPath(pathname: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some((p) =>
    typeof p === 'string' ? pathname === p || pathname.startsWith(p) : p.test(pathname),
  );
}

export default fp<Opts>(async (app, opts) => {
  const token = process.env.BEARER_TOKEN;
  const publicPaths = opts.publicPaths ?? ['/health', '/openapi.json', '/version'];

  if (!token) {
    app.log.info('auth disabled: BEARER_TOKEN not set');
    return;
  }

  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const pathname = (req.url || '').split('?')[0] || '/';
    if (isPublicPath(pathname, publicPaths)) return;

    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing bearer token' });
    }
    const presented = auth.slice('Bearer '.length);
    if (presented !== token) {
      return reply.code(403).send({ error: 'Invalid token' });
    }
  });
});
