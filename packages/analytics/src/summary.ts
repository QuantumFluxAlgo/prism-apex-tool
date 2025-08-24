import { calculatePayoutStatus, type PayoutStatus } from './payout.js';

export interface TradeEvent {
  pnl?: number;
  fees?: number;
  type?: string;
  [key: string]: unknown;
}

export interface Summary {
  date: string;
  pnl: { gross: number; net: number };
  breaches: TradeEvent[];
  operatorActions: TradeEvent[];
  payoutStatus: PayoutStatus;
}

export function generateSummary(
  events: TradeEvent[],
  date: Date = new Date(),
): Summary {
  const gross = events.reduce((sum, e) => sum + (e.pnl ?? 0), 0);
  const fees = events.reduce((sum, e) => sum + (e.fees ?? 0), 0);
  const net = gross - fees;

  const breaches = events.filter((e) => e.type === 'GUARDRAIL' || e.type === 'PANIC');
  const operatorActions = events.filter((e) =>
    ['TICKET', 'PANIC', 'TRAINING'].includes(e.type ?? ''),
  );

  const payoutStatus = calculatePayoutStatus(net, breaches);
  // TODO(Phase 3): persist report and notify channels
  return {
    date: date.toISOString().slice(0, 10),
    pnl: { gross, net },
    breaches,
    operatorActions,
    payoutStatus,
  };
}
