import type { FastifyInstance } from 'fastify';
import { trackEvent } from '@prism-apex-tool/analytics';

interface PayoutStatus {
  cumulativePnL: number;
  threshold: number;
  eligible: boolean;
  breached: boolean;
}

const PAYOUT_THRESHOLD = 2500;

function calculatePayoutStatus(
  dailyPnL: number,
  breaches: unknown[] = [],
  prevStatus: PayoutStatus = {
    cumulativePnL: 0,
    threshold: PAYOUT_THRESHOLD,
    eligible: false,
    breached: false,
  },
): PayoutStatus {
  const cumulativePnL = prevStatus.cumulativePnL + dailyPnL;
  const breached = prevStatus.breached || breaches.length > 0;
  const eligible = cumulativePnL >= PAYOUT_THRESHOLD && !breached;
  return { cumulativePnL, threshold: PAYOUT_THRESHOLD, eligible, breached };
}

interface TradeEvent {
  pnl?: number;
  fees?: number;
  type?: string;
  [key: string]: unknown;
}

function generateSummary(events: TradeEvent[], date: Date = new Date()) {
  const gross = events.reduce((sum, e) => sum + (e.pnl ?? 0), 0);
  const fees = events.reduce((sum, e) => sum + (e.fees ?? 0), 0);
  const net = gross - fees;

  const breaches = events.filter((e) => e.type === 'GUARDRAIL' || e.type === 'PANIC');
  const operatorActions = events.filter((e) =>
    ['TICKET', 'PANIC', 'TRAINING'].includes(e.type ?? ''),
  );

  const payoutStatus = calculatePayoutStatus(net, breaches);
  return {
    date: date.toISOString().slice(0, 10),
    pnl: { gross, net },
    breaches,
    operatorActions,
    payoutStatus,
  };
}

export async function analyticsRoutes(app: FastifyInstance) {
  app.get('/analytics/summary', async () => {
    const events = [
      { pnl: 1000, fees: 50, type: 'TRADE' },
      { pnl: 500, fees: 25, type: 'PANIC' },
    ];
    trackEvent('analytics.summary', { count: events.length });
    return generateSummary(events, new Date('2025-01-02'));
  });
}
