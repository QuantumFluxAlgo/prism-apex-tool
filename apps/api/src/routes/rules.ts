import type { FastifyInstance } from 'fastify';
import { store } from '../store';
import { checkEODCutoff } from '../../../../packages/rules-apex/src/checkEODCutoff.ts';

export async function rulesRoutes(app: FastifyInstance) {
  app.get('/rules/status', async () => {
    const ctx = store.getRiskContext();
    const eodState = checkEODCutoff(new Date());
    return {
      stopRequired: true,
      rrLeq5: true,
      ddHeadroom: true,
      halfSize: !ctx.bufferAchieved ? `Half until buffer; maxContracts=${ctx.maxContracts}` : 'Full size allowed',
      consistencyPolicy: { warnAt: 0.25, failAt: 0.30 },
      eodState,
    };
  });
}
