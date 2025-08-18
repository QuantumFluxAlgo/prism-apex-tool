export type ConsistencyState = 'OK' | 'WARN' | 'FAIL';

/**
 * Consistency rule: today's profit should not exceed 30% of total period profits.
 * - We WARN at >= 25% to keep a safety buffer.
 * - We FAIL at >= 30%.
 *
 * Inputs:
 *  - todayProfit: profit realized today (can be negative or zero).
 *  - periodProfit: cumulative profit for the rest of the period (excluding today).
 *
 * Behavior:
 *  - Only positive profits count toward the ratio.
 *  - If total <= 0, return 'OK' (no consistency pressure).
 *  - share = todayPos / (todayPos + periodPos)
 */
export function checkConsistency30(todayProfit: number, periodProfit: number): ConsistencyState {
  const todayPos = Math.max(0, Number.isFinite(todayProfit) ? todayProfit : 0);
  const periodPos = Math.max(0, Number.isFinite(periodProfit) ? periodProfit : 0);
  const total = todayPos + periodPos;

  if (!(total > 0)) return 'OK'; // nothing to compare against
  const share = todayPos / total;

  if (share >= 0.30 - Number.EPSILON) return 'FAIL';
  if (share >= 0.25 - Number.EPSILON) return 'WARN';
  return 'OK';
}
