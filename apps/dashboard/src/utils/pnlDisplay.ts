import { computePnL, round2, type Direction } from '@prism-apex/shared/pnl';
import { getSpecByYahooSymbol } from '@prism-apex/shared/contracts';

export interface DisplayPnL {
  showNumbers: boolean;
  reason?: string;
  ticksToTarget?: number | null;
  ticksToStop?: number | null;
  tickValueUSD?: number | null;
  pnlTargetUSD?: number | null;
  pnlStopUSD?: number | null;
  rr?: number | null;
  friendly?: {
    tickValue?: string;
    target?: string;
    stop?: string;
    rr?: string;
  };
}

/**
 * Builds UI-friendly PnL metrics. Returns `showNumbers=false` if the symbol lacks a verified tick spec.
 */
export async function buildPnLDisplay(
  symbol: string,
  entry: number,
  target: number,
  stop: number,
  direction: Direction,
  quantity = 1,
): Promise<DisplayPnL> {
  const spec = await getSpecByYahooSymbol(symbol);

  if (!spec || !spec.tickSpecVerified || !spec.tickSize || !spec.tickValueUSD) {
    return { showNumbers: false, reason: 'No verified tick size/value — manual sizing required' };
  }

  const result = computePnL({
    entryPrice: entry,
    targetPrice: target,
    stopPrice: stop,
    tickSize: spec.tickSize,
    tickValueUSD: spec.tickValueUSD,
    direction,
    quantity,
  });

  if (!result.ok) {
    return { showNumbers: false, reason: result.reason ?? 'Tick spec invalid' };
  }

  const tickValue = spec.tickValueUSD;
  const ticksToTarget = result.ticksToTarget ?? 0;
  const ticksToStop = result.ticksToStop ?? 0;
  const pnlTargetUSD = result.pnlTargetUSD ?? 0;
  const pnlStopUSD = result.pnlStopUSD ?? 0;
  const rr = result.riskReward;

  return {
    showNumbers: true,
    ticksToTarget: result.ticksToTarget,
    ticksToStop: result.ticksToStop,
    tickValueUSD: tickValue,
    pnlTargetUSD: result.pnlTargetUSD,
    pnlStopUSD: result.pnlStopUSD,
    rr,
    friendly: {
      tickValue: `$${tickValue.toFixed(2)} / tick`,
      target: `${ticksToTarget} ticks × $${tickValue.toFixed(2)} = $${round2(pnlTargetUSD).toFixed(2)}`,
      stop: `${ticksToStop} ticks × $${tickValue.toFixed(2)} = $${round2(pnlStopUSD).toFixed(2)}`,
      rr: rr != null ? `${rr.toFixed(2)} : 1` : undefined,
    },
  };
}
