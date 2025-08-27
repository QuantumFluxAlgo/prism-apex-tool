import fs from 'node:fs';
import path from 'node:path';

export interface DailyPnL {
  date: string;
  pnl: number;
}

export interface ConsistencyResult {
  window: number;
  totalPnL: number;
  bestDayPnL: number;
  bestDayShare: number; // 0..1
  profitDayCount: number;
  eligible: boolean;
  days: DailyPnL[]; // normalized, sorted asc, last `window`
}

/**
 * Compute payout consistency metrics over the last `window` days.
 * Rules:
 *  - eligible = totalPnL > 0
 *              && profitDayCount >= 5
 *              && bestDayShare <= 0.30
 *  - bestDayShare = (totalPnL > 0 && bestDayPnL > 0) ? bestDayPnL / totalPnL : 0
 */
export function computeConsistency(input: DailyPnL[], window = 8): ConsistencyResult {
  const w = clamp(Math.floor(window), 1, 15);

  // Sanitize: valid date string and finite pnl number
  const valid = (input ?? []).filter(
    (r) =>
      typeof r?.date === 'string' && isFiniteNumber(r?.pnl) && /^\d{4}-\d{2}-\d{2}$/.test(r.date),
  );

  // Sort ascending by date, take last w
  valid.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const days = valid.slice(-w);

  // Sums and metrics
  let totalPnL = 0;
  let bestDayPnL = Number.NEGATIVE_INFINITY;
  let profitDayCount = 0;

  for (const d of days) {
    totalPnL += d.pnl;
    if (d.pnl > bestDayPnL) bestDayPnL = d.pnl;
    if (d.pnl > 0) profitDayCount += 1;
  }
  if (!isFiniteNumber(bestDayPnL)) bestDayPnL = 0;

  const bestDayShare = totalPnL > 0 && bestDayPnL > 0 ? bestDayPnL / totalPnL : 0;
  const eligible = totalPnL > 0 && profitDayCount >= 5 && bestDayShare <= 0.3;

  return { window: w, totalPnL, bestDayPnL, bestDayShare, profitDayCount, eligible, days };
}

export function loadDailyPnLFromDisk(): DailyPnL[] | null {
  const file = path.resolve(process.cwd(), 'var', 'pnl', 'daily.json');
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as DailyPnL[]) : [];
  } catch {
    return [];
  }
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default { computeConsistency, loadDailyPnLFromDisk };
