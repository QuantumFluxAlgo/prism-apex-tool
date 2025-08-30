import { clamp, last, rMultiple, ticksBetween, pricePlusTicks } from './util.js';
import { loadStrategyConfig, mergeParams } from './config/strategy-config.js';
/**
 * Assumes bars are RTH-filtered for the session and vwapSeries resets at session open.
 * Emits at most one suggestion for the first clean touch after a trend leg with slope filter.
 */
export function vwapFirstTouch(symbol, bars, vwapSeries, atrSeries, tick, params = {}, nowIso) {
  const defaults = loadStrategyConfig('vwap-first-touch');
  const P = mergeParams(defaults, params);
  if (bars.length < Math.max(P.warmupBars, P.slopeLookback + 1)) return [];
  const n = bars.length;
  const vnow = vwapSeries[n - 1];
  const atrNow = atrSeries[n - 1];
  if (atrNow == null) return [];
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
  const side =
    lastClose >= vnow && slope >= 0 ? 'BUY' : lastClose <= vnow && slope <= 0 ? 'SELL' : null;
  if (!side || !hadDistance) return [];
  // "Clean touch": price touches VWAP w/o blasting through > maxTouchKATR * ATR
  const touchBar = last(bars);
  const overshoot = Math.abs(touchBar.close - vnow);
  if (overshoot > P.maxTouchKATR * atrNow) return [];
  // Entry at VWAP (one tick inside by default)
  const entry =
    side === 'BUY'
      ? pricePlusTicks(vnow, +P.entryOffsetTicks, tick.tickSize)
      : pricePlusTicks(vnow, -P.entryOffsetTicks, tick.tickSize);
  const stopBuf = Math.max(P.minStopTicks, Math.round((P.stopKATR * atrNow) / tick.tickSize));
  const stop =
    side === 'BUY'
      ? pricePlusTicks(vnow, -stopBuf, tick.tickSize)
      : pricePlusTicks(vnow, +stopBuf, tick.tickSize);
  const riskTicks = ticksBetween(entry, stop, tick.tickSize);
  if (riskTicks < P.minStopTicks) return [];
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
