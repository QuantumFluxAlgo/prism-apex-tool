import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getStrategyConfig } from '../services/strategyConfig.js';

export const strategiesConfigRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/api/strategies/config', async () => getStrategyConfig());
};

export default strategiesConfigRoutes;
