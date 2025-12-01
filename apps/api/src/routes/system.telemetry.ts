import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getSystemTelemetry, type JobTelemetrySnapshot } from '../store/systemTelemetry.js';

type SystemTelemetryResponse = {
  jobs: JobTelemetrySnapshot[];
};

export const systemTelemetryRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/api/system/telemetry', async (): Promise<SystemTelemetryResponse> => ({
    jobs: getSystemTelemetry(),
  }));
};

export default systemTelemetryRoutes;
