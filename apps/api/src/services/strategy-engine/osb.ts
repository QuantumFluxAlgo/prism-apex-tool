import type { OSBConfig } from '../../dto/strategy-config/osb.js';
import type { EngineSignal } from '../../dto/strategy-engine/index.js';
import type { EngineBar } from './bars.js';

const MILLIS_PER_MINUTE = 60_000;
const DEFAULT_OPENING_RANGE_MINUTES = 30;
const MIN_BARS = 10;

function toMillis(timestamp: string): number {
  return new Date(timestamp).getTime();
}

function normalizeOpeningRangeMinutes(value: number | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return DEFAULT_OPENING_RANGE_MINUTES;
}

function normalizePositive(value: number | undefined, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return fallback;
}

function normalizeDirectionBias(value: string | undefined): 'LONG' | 'SHORT' | 'BOTH' {
  if (value === 'LONG' || value === 'SHORT' || value === 'BOTH') {
    return value;
  }
  return 'BOTH';
}

export function runOsbStrategy(bars: EngineBar[], config: OSBConfig): EngineSignal[] {
  if (!bars.length || bars.length < MIN_BARS) {
    return [];
  }

  const openingRangeMinutes = normalizeOpeningRangeMinutes(config.openingRangeMinutes);
  const breakoutDistance = normalizePositive(config.breakoutDistance);
  const directionBias = normalizeDirectionBias(config.directionBias);
  const volatilityFilter = normalizePositive(config.volatilityFilter);
  const rrMultiple = normalizePositive(config.rrMultiple, 1);

  const sessionStart = toMillis(bars[0].timestamp);
  const openingRangeCutoff = sessionStart + openingRangeMinutes * MILLIS_PER_MINUTE;

  const openingRangeBars = bars.filter((bar) => toMillis(bar.timestamp) <= openingRangeCutoff);
  if (!openingRangeBars.length) {
    return [];
  }

  const orHigh = Math.max(...openingRangeBars.map((bar) => bar.high));
  const orLow = Math.min(...openingRangeBars.map((bar) => bar.low));
  const orRange = orHigh - orLow;

  if (!Number.isFinite(orRange) || orRange <= 0) {
    return [];
  }

  if (volatilityFilter > 0 && orRange < volatilityFilter) {
    return [];
  }

  const postRangeBars = bars.filter((bar) => toMillis(bar.timestamp) > openingRangeCutoff);
  if (!postRangeBars.length) {
    return [];
  }

  const highBreakThreshold = breakoutDistance > 0 ? orHigh + breakoutDistance : orHigh;
  const lowBreakThreshold = breakoutDistance > 0 ? orLow - breakoutDistance : orLow;

  let breakoutBar: EngineBar | null = null;
  let direction: 'LONG' | 'SHORT' | null = null;

  for (const bar of postRangeBars) {
    const canLong = directionBias === 'LONG' || directionBias === 'BOTH';
    const canShort = directionBias === 'SHORT' || directionBias === 'BOTH';
    if (canLong && bar.high >= highBreakThreshold) {
      breakoutBar = bar;
      direction = 'LONG';
      break;
    }
    if (canShort && bar.low <= lowBreakThreshold) {
      breakoutBar = bar;
      direction = 'SHORT';
      break;
    }
  }

  if (!breakoutBar || !direction) {
    return [];
  }

  const entryPrice = breakoutBar.close;
  if (!Number.isFinite(entryPrice)) {
    return [];
  }

  let stopPrice: number;
  let targetPrice: number;

  if (direction === 'LONG') {
    stopPrice = orLow;
    const risk = entryPrice - stopPrice;
    if (!Number.isFinite(risk) || risk <= 0) {
      return [];
    }
    targetPrice = entryPrice + risk * rrMultiple;
    if (!(stopPrice < entryPrice && entryPrice < targetPrice)) {
      return [];
    }
  } else {
    stopPrice = orHigh;
    const risk = stopPrice - entryPrice;
    if (!Number.isFinite(risk) || risk <= 0) {
      return [];
    }
    targetPrice = entryPrice - risk * rrMultiple;
    if (!(targetPrice < entryPrice && entryPrice < stopPrice)) {
      return [];
    }
  }

  const breakoutMagnitude =
    direction === 'LONG' ? Math.max(0, breakoutBar.high - orHigh) : Math.max(0, orLow - breakoutBar.low);
  const reason = `OSB ${direction.toLowerCase()}: breakout of opening range (range=${orRange.toFixed(
    2,
  )}, breakout=${breakoutMagnitude.toFixed(2)}, volFilter=${volatilityFilter.toFixed(
    2,
  )}, rr=${rrMultiple.toFixed(2)}, bias=${directionBias})`;

  return [
    {
      id: `osb-${breakoutBar.timestamp}`,
      timestamp: breakoutBar.timestamp,
      direction,
      price: entryPrice,
      entryPrice,
      stopPrice,
      targetPrice,
      reason,
    },
  ];
}
