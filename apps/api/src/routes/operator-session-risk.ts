import type { FastifyPluginAsync } from 'fastify';
import {
  getSessionRisk,
  setDailyRiskLimit,
} from '../store/operatorSessionRisk.js';
import { getSessionInfo } from './status.js';

const OPERATOR_ID = 'DEFAULT';

type OperatorRiskResponse = {
  sessionDateUtc: string;
  dailyRiskLimitUsd: number | null;
  riskUsedUsd: number;
  riskRemainingUsd: number;
  locked: boolean;
};

function toResponse(
  sessionDateUtc: string,
  locked: boolean,
  risk: { dailyRiskLimitUsd: number; riskUsedUsd: number } | null,
): OperatorRiskResponse {
  const dailyRiskLimitUsd = risk?.dailyRiskLimitUsd ?? null;
  const riskUsedUsd = risk?.riskUsedUsd ?? 0;
  const riskRemainingUsd =
    dailyRiskLimitUsd != null ? Math.max(0, dailyRiskLimitUsd - riskUsedUsd) : 0;
  return {
    sessionDateUtc,
    dailyRiskLimitUsd,
    riskUsedUsd,
    riskRemainingUsd,
    locked,
  };
}

const operatorSessionRiskRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/operator-risk/session', async () => {
    const { sessionDateUtc, isOpen } = getSessionInfo();
    const risk = await getSessionRisk(OPERATOR_ID, sessionDateUtc);
    return toResponse(sessionDateUtc, isOpen, risk);
  });

  app.post('/api/operator-risk/session', async (req, reply) => {
    const body = (req.body ?? {}) as { dailyRiskLimitUsd?: number };
    if (typeof body.dailyRiskLimitUsd !== 'number' || !(body.dailyRiskLimitUsd > 0)) {
      return reply.code(400).send({ error: 'invalid_daily_risk_limit' });
    }
    const { sessionDateUtc, isOpen } = getSessionInfo();
    if (isOpen) {
      return reply.code(409).send({ error: 'session_locked' });
    }
    const record = await setDailyRiskLimit(
      OPERATOR_ID,
      sessionDateUtc,
      body.dailyRiskLimitUsd,
    );
    return toResponse(sessionDateUtc, isOpen, record);
  });
};

export default operatorSessionRiskRoutes;
