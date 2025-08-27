import { Candle, Suggestion } from './types.js';
import { VwapSeries, AtrSeries, VwapFtParams, TickSpec } from './inputs.js';
import { clamp, last, rMultiple, ticksBetween, pricePlusTicks } from './util.js';

/**
 * Assumes bars are RTH-filtered for the session and vwapSeries resets at session open.
 * Emits at most one suggestion for the first clean touch after a trend leg with slope filter.
 */
export function vwapFirstTouch(
  symbol: string,
  bars: Candle[],
  vwapSeries: VwapSeries,
  atrSeries: AtrSeries,
  tick: TickSpec,
  params: Partial<VwapFtParams> = {},
  nowIso?: string,
): Suggestion[] {
  const P: VwapFtParams = {
    slopeLookback: 10,
    minDistanceATR: 0.5,
    stopKATR: 0.25,
    rrDefault: 2.0,
    rrMin: 1.5,
    rrMax: 3.0,
    minStopTicks: 2,
    ...params,
  };
  if (bars.length < Math.max(20, P.slopeLookback + 1)) return [];

  const n = bars.length;
  const vnow = vwapSeries[n - 1];
  const atrNow = atrSeries[n - 1];
  const slopeStart = Math.max(0, n - 1 - P.slopeLookback);
  const slopeEnd = n - 1;
  const slope = (vwapSeries[slopeEnd] - vwapSeries[slopeStart]) / P.slopeLookback;

  const prevMaxDist = Math.max(
    ...bars
      .slice(slopeStart, slopeEnd)
      .map((b, i) => Math.abs(b.close - vwapSeries[slopeStart + i])),
  );
  const hadDistance = prevMaxDist >= P.minDistanceATR * atrNow;

  const lastClose = bars[n - 1].close;
  const side: 'BUY' | 'SELL' | null =
    lastClose >= vnow && slope >= 0 ? 'BUY' : lastClose <= vnow && slope <= 0 ? 'SELL' : null;
  if (!side || !hadDistance) return [];

  // "Clean touch": price touches VWAP w/o blasting through > 0.25*ATR
  const touchBar = last(bars);
  const overshoot = Math.abs(touchBar.close - vnow);
  if (overshoot > 0.25 * atrNow) return [];

  // Entry at VWAP (one tick inside)
  const entry =
    side === 'BUY'
      ? pricePlusTicks(vnow, +1, tick.tickSize)
      : pricePlusTicks(vnow, -1, tick.tickSize);
  const stopBuf = Math.max(P.minStopTicks ?? 2, Math.round((P.stopKATR * atrNow) / tick.tickSize));
  const stop =
    side === 'BUY'
      ? pricePlusTicks(vnow, -stopBuf, tick.tickSize)
      : pricePlusTicks(vnow, +stopBuf, tick.tickSize);
  const riskTicks = ticksBetween(entry, stop, tick.tickSize);
  if (riskTicks < (P.minStopTicks ?? 2)) return [];

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
      meta: { strategy: 'VWAP_FT', rr: rrReal },
    },
  ];
}
