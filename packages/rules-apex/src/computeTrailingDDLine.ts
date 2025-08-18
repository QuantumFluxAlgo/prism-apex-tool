/**
 * Compute the current trailing drawdown liquidation line.
 * For Apex-style trailing DD: ddLine = netLiqHigh - ddAmount.
 * Assumes both inputs are positive and ddAmount <= netLiqHigh.
 */
export function computeTrailingDDLine(netLiqHigh: number, ddAmount: number): number {
  if (!Number.isFinite(netLiqHigh) || netLiqHigh <= 0) {
    throw new Error('Invalid netLiqHigh');
  }
  if (!Number.isFinite(ddAmount) || ddAmount <= 0) {
    throw new Error('Invalid ddAmount');
  }
  if (ddAmount > netLiqHigh) {
    // In practice this should not happen; clamp at small positive line.
    return 0.01;
  }
  return netLiqHigh - ddAmount;
}
