import type { FastifyPluginAsync } from 'fastify';
import { getDailyRiskSnapshot } from '../services/operatorRisk.js';

export const operatorRiskRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/operator-risk/daily', async (request) => {
    const dateParam = typeof request.query === 'object' && request.query !== null ? (request.query as any).dateUtc : undefined;
    const dateUtc = typeof dateParam === 'string' ? dateParam : undefined;
    return getDailyRiskSnapshot({ dateUtc });
  });
};

export default operatorRiskRoutes;
