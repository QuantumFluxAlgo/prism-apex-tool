import { FastifyPluginAsync } from 'fastify';

const normalize = (s: string) =>
  s.toLowerCase()
   .replace(/\(.*?\)/g, '')      // drop parentheses e.g. "(ORR)"
   .replace(/[^a-z0-9]+/g, '-')  // spaces, underscores -> dashes
   .replace(/^-+|-+$/g, '');     // trim dashes

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook('preValidation', async (req) => {
    const q: any = (req as any).query;
    if (!q || typeof q.strategy !== 'string') return;

    const key = normalize(q.strategy);
    // Accept common variants and map to canonical
    const isORR =
      key === 'orr' ||
      key === 'open-range-retest' ||
      key === 'apx-ddb-01' ||
      key === 'apx-ddb01' ||
      key === 'apxddb01';

    if (isORR) q.strategy = 'APX-DDB-01';
  });
};

export default plugin;
