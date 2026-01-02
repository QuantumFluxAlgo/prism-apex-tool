import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getRecentSystemAlerts, type SystemAlert } from '../store/systemAlerts.js';

export type SystemAlertsResponse = {
  alerts: SystemAlert[];
};

export const systemAlertsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/api/system/alerts', async (): Promise<SystemAlertsResponse> => ({
    alerts: getRecentSystemAlerts(),
  }));
};

export default systemAlertsRoutes;
