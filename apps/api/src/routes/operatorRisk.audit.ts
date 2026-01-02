import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getRecentRiskAuditLog, type RiskAuditEntry } from '../store/riskAuditLog.js';

export type OperatorRiskAuditResponse = {
  entries: RiskAuditEntry[];
};

export const operatorRiskAuditRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/api/operator-risk/audit', async (): Promise<OperatorRiskAuditResponse> => ({
    entries: getRecentRiskAuditLog(),
  }));
};

export default operatorRiskAuditRoutes;
