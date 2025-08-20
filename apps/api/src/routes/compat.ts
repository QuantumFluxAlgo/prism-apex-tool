import type { FastifyInstance } from 'fastify';
import { store } from '../store';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function compatRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true }));

  app.get('/account', async () => {
    const rc = (store.getRiskContext?.() ?? {}) as any;
    const balance = typeof rc.netLiqHigh === 'number' ? rc.netLiqHigh : 52000;
    const drawdown = typeof rc.ddAmount === 'number' ? rc.ddAmount : 0;
    return {
      balance,
      drawdown,
      openPositions: 0,
    };
  });

  app.get('/reports', async () => {
    const report = (store.buildDailyReport?.(today()) ?? {}) as any;
    const max_dd = typeof report.ddAmount === 'number' ? report.ddAmount : 0;
    const rule_breaches = typeof report.blocked === 'number' ? report.blocked : 0;
    return {
      win_rate: 0.0,
      avg_r: 0.0,
      max_dd,
      rule_breaches,
    };
  });

  app.get('/alerts', async () => {
    const arr = store.peekAlerts?.(50) ?? [];
    return arr.map((a) => ({
      message: a.human || `[${a.symbol ?? '-'}] ${a.side ?? ''} ${a.price ?? ''}`.trim(),
    }));
  });

  app.get('/tickets', async () => []);
}
