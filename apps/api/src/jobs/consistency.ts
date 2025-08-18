import { store } from '../store';
import { notify } from './util';

/**
 * Consistency proximity monitor (funded mode).
 * Uses store.riskContext.todayProfit & periodProfit for MVP.
 * ratio = maxDay / sumPeriod; warn≥25%, critical≥30%.
 */
export async function jobConsistency() {
  const ctx = store.getRiskContext();
  const sum = Math.max(0.01, Number(ctx.periodProfit || 0)); // avoid zero div
  const maxDay = Math.max(Number(ctx.todayProfit || 0), 0);
  const ratio = maxDay / sum;

  if (ratio >= 0.30) {
    await notify('CONSISTENCY_30', 'CRITICAL', 'Consistency ratio ≥30%', `Today: ${maxDay.toFixed(2)} vs Period: ${sum.toFixed(2)} → ${(ratio*100).toFixed(1)}%`, ['CONSISTENCY']);
  } else if (ratio >= 0.25) {
    await notify('CONSISTENCY_25', 'WARN', 'Consistency ratio ≥25%', `Today: ${maxDay.toFixed(2)} vs Period: ${sum.toFixed(2)} → ${(ratio*100).toFixed(1)}%`, ['CONSISTENCY']);
  }
}
