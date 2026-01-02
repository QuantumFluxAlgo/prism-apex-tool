import type { ORRConfig } from '../../dto/strategy-config/orr.js';
import type { EngineSignal } from '../../dto/strategy-engine/index.js';
import type { EngineBar } from './bars.js';

const MILLIS_PER_MINUTE = 60_000;
const DEFAULT_OPENING_RANGE_MINUTES = 30;
const MIN_BARS = 10;

function toMillis(timestamp: string): number {
  return new Date(timestamp).getTime();
}

/**
 * Produce at most one ORR signal for a given session of bars.
 * Logic: compute opening range, detect a breakout beyond the range,
 * wait for a reclaim, and emit an entry back inside the range.
 *
 * NOTE: bars_1m rows do not currently surface RTH/ETH metadata, so the allowedSession
 * guard must be enforced upstream (config/routing) until that field is available.
 */
export function runOrrStrategy(bars: EngineBar[], config: ORRConfig): EngineSignal[] {
  if (!bars.length || bars.length < MIN_BARS) {
    return [];
  }

  const openingRangeMinutes =
    typeof config.openingRangeMinutes === 'number' && Number.isFinite(config.openingRangeMinutes) && config.openingRangeMinutes > 0
      ? config.openingRangeMinutes
      : DEFAULT_OPENING_RANGE_MINUTES;
  const maxRange = Number.isFinite(config.maxRange) && config.maxRange > 0 ? config.maxRange : null;
  const retestDistance =
    typeof config.retestDistance === 'number' && Number.isFinite(config.retestDistance) && config.retestDistance > 0
      ? config.retestDistance
      : 0;
  const minRR =
    typeof config.minRR === 'number' && Number.isFinite(config.minRR) && config.minRR > 0 ? config.minRR : 1;
  const stopSize =
    typeof config.stopSize === 'number' && Number.isFinite(config.stopSize) && config.stopSize > 0 ? config.stopSize : 1;

  const sessionStartMs = toMillis(bars[0].timestamp);
  const openingRangeCutoff = sessionStartMs + openingRangeMinutes * MILLIS_PER_MINUTE;

  const openingRangeBars = bars.filter((bar) => toMillis(bar.timestamp) <= openingRangeCutoff);
  if (!openingRangeBars.length) {
    return [];
  }

  const orHigh = Math.max(...openingRangeBars.map((bar) => bar.high));
  const orLow = Math.min(...openingRangeBars.map((bar) => bar.low));
  const orRange = orHigh - orLow;

  if (orRange <= 0) {
    return [];
  }
  if (maxRange !== null && orRange > maxRange) {
    return [];
  }

  const breakoutBars = bars.filter((bar) => toMillis(bar.timestamp) > openingRangeCutoff);
  if (!breakoutBars.length) {
    return [];
  }

  const minBreakDistance = retestDistance > 0 ? retestDistance : 0;
  const breakoutThresholdHigh = orHigh + minBreakDistance;
  const breakoutThresholdLow = orLow - minBreakDistance;

  let breakoutIndex = -1;
  let breakoutDirection: 'UP' | 'DOWN' | null = null;

  for (let i = 0; i < breakoutBars.length; i += 1) {
    const bar = breakoutBars[i];
    if (bar.high >= breakoutThresholdHigh) {
      breakoutIndex = i;
      breakoutDirection = 'UP';
      break;
    }
    if (bar.low <= breakoutThresholdLow) {
      breakoutIndex = i;
      breakoutDirection = 'DOWN';
      break;
    }
  }

  if (breakoutIndex === -1 || breakoutDirection === null) {
    return [];
  }

  const breakoutBar = breakoutBars[breakoutIndex];
  const postBreakoutBars = breakoutBars.slice(breakoutIndex + 1);

  const useRetestFilter = config.enableRetestFilter === true;
  const findRetest = (): EngineBar | undefined => {
    if (!postBreakoutBars.length) {
      return undefined;
    }
    if (!useRetestFilter) {
      return postBreakoutBars.find((bar) =>
        breakoutDirection === 'UP' ? bar.close < orHigh : bar.close > orLow,
      );
    }
    const minRetestDistance = minBreakDistance;
    return postBreakoutBars.find((bar) =>
      breakoutDirection === 'UP'
        ? bar.close <= orHigh - minRetestDistance
        : bar.close >= orLow + minRetestDistance,
    );
  };

  const retestBar = findRetest();
  if (!retestBar) {
    return [];
  }

  const direction = breakoutDirection === 'UP' ? 'SHORT' : 'LONG';
  const entryPrice = retestBar.close;
  const breakoutExtreme =
    breakoutDirection === 'UP' ? Math.max(breakoutBar.high, orHigh) : Math.min(breakoutBar.low, orLow);
  const stopPrice = breakoutDirection === 'UP' ? breakoutExtreme + stopSize : breakoutExtreme - stopSize;

  const risk = Math.abs(entryPrice - stopPrice);
  if (risk <= 0) {
    return [];
  }

  const targetPrice = direction === 'LONG' ? entryPrice + risk * minRR : entryPrice - risk * minRR;

  if (direction === 'LONG') {
    if (!(stopPrice < entryPrice && targetPrice > entryPrice)) {
      return [];
    }
  } else if (!(stopPrice > entryPrice && targetPrice < entryPrice)) {
    return [];
  }

  const breakoutDistance =
    breakoutDirection === 'UP' ? Math.max(0, breakoutBar.high - orHigh) : Math.max(0, orLow - breakoutBar.low);
  const baseDetails = `(range=${orRange.toFixed(2)}, breakout=${breakoutDistance.toFixed(2)}, retest=${retestDistance.toFixed(2)})`;

  const reason =
    direction === 'LONG'
      ? `ORR long: failed breakdown and reclaim of opening range low ${baseDetails}`
      : `ORR short: failed breakout and rejection of opening range high ${baseDetails}`;

  return [
    {
      id: `orr-${retestBar.timestamp}`,
      timestamp: retestBar.timestamp,
      direction,
      price: entryPrice,
      entryPrice,
      stopPrice,
      targetPrice,
      reason,
    },
  ];
}
