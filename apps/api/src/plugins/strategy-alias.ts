import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const normalize = (s: string) =>
  s.toLowerCase()
   .replace(/\(.*?\)/g, '')      // drop parentheses e.g. "(ORR)"
   .replace(/[^a-z0-9]+/g, '-')  // spaces, underscores -> dashes
   .replace(/^-+|-+$/g, '');     // trim dashes

const strategyAliasPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preValidation', async (req) => {
    const q: any = (req as any).query;
    if (!q || typeof q.strategy !== 'string') return;

    const key = normalize(q.strategy);
    const isORR =
      key === 'orr' ||
      key === 'open-range-retest' ||
      key === 'apx-ddb-01' ||
      key === 'apx-ddb01' ||
      key === 'apxddb01';

    if (isORR && q.strategy !== 'APX-DDB-01') {
      (req as any).query = { ...q, strategy: 'APX-DDB-01' };
    }
  });
};

export default fp(strategyAliasPlugin, { name: 'strategy-alias' });
