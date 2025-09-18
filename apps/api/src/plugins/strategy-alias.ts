import { FastifyPluginAsync } from 'fastify';

const STRATEGY_ALIASES: Record<string,string> = {
  'ORR': 'APX-DDB-01',
  'APX-DDB-01': 'APX-DDB-01',
  'apx-ddb01': 'APX-DDB-01',
  'apx-ddb-01': 'APX-DDB-01',
  'open-range-retest': 'APX-DDB-01',
};

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook('preValidation', async (req) => {
    const q: any = (req as any).query;
    if (q && typeof q.strategy === 'string') {
      const key = q.strategy.trim();
      const mapped = STRATEGY_ALIASES[key] || STRATEGY_ALIASES[key.toUpperCase?.()];
      if (mapped) q.strategy = mapped;
    }
  });
};

export default plugin;
