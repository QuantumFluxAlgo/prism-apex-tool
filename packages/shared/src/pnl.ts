export type Direction = 'LONG' | 'SHORT';

export interface PnLInput {
  entryPrice: number;
  targetPrice: number;
  stopPrice: number;
  tickSize: number | null;
  tickValueUSD: number | null;
  direction: Direction;
  quantity?: number;
}

export interface PnLResult {
  ok: boolean;
  ticksToTarget: number | null;
  ticksToStop: number | null;
  pnlTargetUSD: number | null;
  pnlStopUSD: number | null;
  riskReward: number | null;
  reason?: string;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const isPositiveNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export function computePnL(input: PnLInput): PnLResult {
  const {
    entryPrice,
    targetPrice,
    stopPrice,
    tickSize,
    tickValueUSD,
    direction,
    quantity = 1,
  } = input;

  if (!isPositiveNumber(tickSize) || !isPositiveNumber(tickValueUSD)) {
    return {
      ok: false,
      ticksToTarget: null,
      ticksToStop: null,
      pnlTargetUSD: null,
      pnlStopUSD: null,
      riskReward: null,
      reason: 'Tick spec missing or invalid',
    };
  }

  const diffToTicks = (from: number, to: number): number =>
    Math.round(Math.abs(to - from) / tickSize);

  const ticksToTarget = diffToTicks(entryPrice, targetPrice);
  const ticksToStop = diffToTicks(entryPrice, stopPrice);
  const pnlPerTick = tickValueUSD * quantity;

  const favorable =
    direction === 'LONG' ? targetPrice > entryPrice : targetPrice < entryPrice;

  const pnlTargetUSD = round2((favorable ? 1 : -1) * ticksToTarget * pnlPerTick);
  const pnlStopUSD = round2(-ticksToStop * pnlPerTick);
  const riskReward =
    ticksToStop > 0 ? round2(Math.abs(ticksToTarget) / Math.abs(ticksToStop)) : null;

  return {
    ok: true,
    ticksToTarget,
    ticksToStop,
    pnlTargetUSD,
    pnlStopUSD,
    riskReward,
  };
}
