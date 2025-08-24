import fp from 'fastify-plugin';
import type { FastifyRequest, FastifyReply } from 'fastify';

type Opts = {
  max?: number; // requests per window per IP
  windowMs?: number; // window size in ms
  publicPaths?: (string | RegExp)[];
  maxBuckets?: number; // max unique (ip+path) buckets to retain
};

function isPublic(pathname: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some((p) =>
    typeof p === 'string' ? pathname === p || pathname.startsWith(p) : p.test(pathname),
  );
}

export default fp<Opts>(async (app, opts) => {
  const max = Number(process.env.RATE_LIMIT_MAX ?? opts.max ?? 60);
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? opts.windowMs ?? 60_000);
  const publicPaths = opts.publicPaths ?? ['/health', '/ready', '/openapi.json', '/version'];
  const maxBuckets = Number(process.env.RATE_LIMIT_MAX_BUCKETS ?? opts.maxBuckets ?? 50_000);

  type Bucket = { count: number; resetAt: number };
  const buckets = new Map<string, Bucket>(); // insertion-ordered

  // Periodic sweep to drop expired buckets
  const sweeper = setInterval(
    () => {
      const now = Date.now();
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    },
    Math.min(windowMs, 30_000),
  );
  // avoid keeping the event loop alive just for the sweeper
  // @ts-expect-error Node types don’t include unref on Timeout in all TS configs
  sweeper.unref?.();

  app.addHook('onClose', async () => {
    clearInterval(sweeper as NodeJS.Timeout);
  });

  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const pathname = (req.url || '').split('?')[0] || '/';

    // Skip public routes and CORS preflight
    if (isPublic(pathname, publicPaths) || req.method === 'OPTIONS') return;

    const key = `${req.ip || 'ip:unknown'}:${pathname}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      // Soft-cap the number of buckets (FIFO eviction)
      if (buckets.size >= maxBuckets) {
        const firstKey = buckets.keys().next().value as string | undefined;
        if (firstKey) buckets.delete(firstKey);
      }
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (bucket.count >= max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      reply.header('Retry-After', String(Math.max(retryAfterSec, 0)));
      return reply.code(429).send({ error: 'Too Many Requests' });
    }

    bucket.count += 1;
  });
});
