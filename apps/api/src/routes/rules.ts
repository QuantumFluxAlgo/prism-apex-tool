import type { FastifyInstance } from 'fastify';
import { store } from '../store';
import { checkEODCutoff } from '../../../../packages/rules-apex/src/checkEODCutoff.ts';
import { dispatch, type NotifyMessage } from '../../../../packages/notify/src';
import { loadNotifyConfig } from './notify';

export async function rulesRoutes(app: FastifyInstance) {
  app.get('/rules/status', async () => {
    const ctx = store.getRiskContext();
    const eodState = checkEODCutoff(new Date());

    if (eodState === 'BLOCK_NEW') {
      const cfg = loadNotifyConfig();
      const key = `EOD_WINDOW_${new Date().toISOString().slice(0,10)}`;
      const msg: NotifyMessage = {
        subject: 'EOD_WINDOW',
        text: 'Entering EOD window (T-5).',
        level: 'INFO',
        tags: ['EOD_WINDOW'],
      };
      await dispatch(cfg, key, msg);
    }

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
