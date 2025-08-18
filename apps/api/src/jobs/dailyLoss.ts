import { TradovateClient } from '../../../../packages/clients-tradovate/src/rest';
import { notify } from './util';

function pct(n: number, d: number) { return d <= 0 ? 0 : (n / d) * 100; }

/**
 * Uses account fields to estimate daily loss proximity.
 * Env override: DAILY_LOSS_CAP_USD; otherwise infer from context isn't guaranteed, so default 1000.
 */
export async function jobDailyLoss() {
  const cap = Number(process.env.DAILY_LOSS_CAP_USD || '1000');
  if (!process.env.TRADOVATE_BASE_URL) return; // env not configured
  const client = new TradovateClient();
  const acct = await client.getAccount() as any;

  const realized = Number(acct.dayPnlRealized || 0);
  const unrealized = Number(acct.dayPnlUnrealized || 0);
  const loss = Math.max(0, -(realized + Math.min(0, unrealized))); // only consider downside
  const usedPct = pct(loss, cap);

  if (usedPct >= 85) {
    await notify('DAILY_LOSS_85', 'CRITICAL', 'Daily loss ≥85% of cap', `Loss used ${usedPct.toFixed(1)}% (${loss.toFixed(2)} of ${cap}). Flatten or reduce risk.`, ['DAILY_LOSS']);
  } else if (usedPct >= 70) {
    await notify('DAILY_LOSS_70', 'WARN', 'Daily loss ≥70% of cap', `Loss used ${usedPct.toFixed(1)}% (${loss.toFixed(2)} of ${cap}). Proceed with caution.`, ['DAILY_LOSS']);
  }
}
