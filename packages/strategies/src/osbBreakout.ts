/* type-only: strategy IO contracts */
import type { ApexStrategyId } from '../../../types/global/apex-types.js';

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
interface Signal {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  target: number;
  rr?: number;
  strategy: ApexStrategyId;
}

import { Candle, Suggestion } from './types.js';
import { AtrSeries, TickSpec } from './inputs.js';
import { clamp, pricePlusTicks, rMultiple, ticksBetween } from './util.js';
import {
  OpeningSessionBreakoutParams,
  loadStrategyConfig,
  mergeParams,
} from './config/strategy-config.js';

/** Opening Swing Breakout over first N minutes of RTH */
export function openingSwingBreakout(
  symbol: string,
  barsRth: Candle[],
  atrSeries: AtrSeries,
  tick: TickSpec,
  params: Partial<OpeningSessionBreakoutParams> = {},
  nowIso?: string,
): Suggestion[] {
  const defaults = loadStrategyConfig<OpeningSessionBreakoutParams>('opening-session-breakout');
  const P = mergeParams(defaults, params);
  if (barsRth.length < P.orMinutes + P.postOrBars) return [];

  const orBars = barsRth.slice(0, P.orMinutes);
  const rest = barsRth.slice(P.orMinutes);
  const orHigh = Math.max(...orBars.map((b) => b.high));
  const orLow = Math.min(...orBars.map((b) => b.low));
  const atrNow = atrSeries[atrSeries.length - 1];
  if (atrNow == null) return [];

  const widthTicks = Math.round((orHigh - orLow) / tick.tickSize);
  const minWidthTicks = Math.max(
    P.widthMinTicks,
    Math.round((P.widthMinATR * atrNow) / tick.tickSize),
  );
  const maxWidthTicks = Math.round((P.widthMaxATR * atrNow) / tick.tickSize);
  if (widthTicks < minWidthTicks || widthTicks > maxWidthTicks) return [];

  const lastBar = rest[rest.length - 1];
  const brokeUp = lastBar.close > orHigh && (!P.requireCloseBreak || lastBar.high >= orHigh);
  const brokeDown = lastBar.close < orLow && (!P.requireCloseBreak || lastBar.low <= orLow);

  if (!brokeUp && !brokeDown) return [];

  const side = brokeUp ? 'BUY' : 'SELL';
  const entry =
    side === 'BUY'
      ? pricePlusTicks(orHigh, +P.entryOffsetTicks, tick.tickSize)
      : pricePlusTicks(orLow, -P.entryOffsetTicks, tick.tickSize);
  let stop =
    side === 'BUY'
      ? pricePlusTicks(orLow, -P.stopOffsetTicks, tick.tickSize)
      : pricePlusTicks(orHigh, +P.stopOffsetTicks, tick.tickSize);

  let riskTicks = ticksBetween(entry, stop, tick.tickSize);
  if (riskTicks < P.minRiskTicks) {
    // enforce minimum risk ticks to avoid micro boxes
    const adj = P.minRiskTicks - riskTicks;
    stop =
      side === 'BUY'
        ? pricePlusTicks(stop, -adj, tick.tickSize)
        : pricePlusTicks(stop, +adj, tick.tickSize);
    riskTicks += adj;
  }

  const rr = clamp(P.rrDefault, P.rrMin, P.rrMax);
  const target = side === 'BUY' ? entry + rr * (entry - stop) : entry - rr * (stop - entry);
  const rrReal = rMultiple(entry, stop, target);
  if (rrReal < P.rrMin) return [];

  return [
    {
      symbol,
      side,
      entry,
      stop,
      target,
      timestampUtc: nowIso ?? new Date().toISOString(),
      meta: { strategy: 'OSB', rr: rrReal },
    },
  ];
}
