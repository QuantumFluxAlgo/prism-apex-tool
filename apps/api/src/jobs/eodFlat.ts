import { notify } from './util';

function isBetweenUtc(now: Date, fromHH: number, fromMM: number, toHH: number, toMM: number) {
  const d = (h: number, m: number) => Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0, 0);
  const t = now.getTime();
  return t >= d(fromHH, fromMM) && t <= d(toHH, toMM);
}

/**
 * EOD reminders:
 * - T-10 (20:49–20:54 UTC): WARN
 * - T-5  (20:55–20:59 UTC): CRITICAL
 * Keys dedupe by day+phase.
 */
export async function jobEodFlat() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);

  if (isBetweenUtc(now, 20, 49, 20, 54)) {
    await notify(`EOD_WARN_${day}`, 'WARN', 'EOD approaching (T-10)', 'Please flatten positions before 20:59 GMT.', ['EOD_WINDOW','T-10']);
  } else if (isBetweenUtc(now, 20, 55, 20, 59)) {
    await notify(`EOD_CRIT_${day}`, 'CRITICAL', 'EOD T–5 Hard Block', 'New tickets are blocked. Confirm you are FLAT by 20:59 GMT.', ['EOD_WINDOW','T-5']);
  }
}
