import { Candle, Suggestion } from './types.js';
import { AtrSeries, OsbParams, TickSpec } from './inputs.js';
import { clamp, pricePlusTicks, rMultiple, ticksBetween } from './util.js';

/** Opening Swing Breakout over first N minutes of RTH */
export function openingSwingBreakout(
  symbol: string,
  barsRth: Candle[],
  atrSeries: AtrSeries,
  tick: TickSpec,
  params: Partial<OsbParams> = {},
  nowIso?: string,
): Suggestion[] {
  const P: OsbParams = {
    orMinutes: 5,
    requireCloseBreak: true,
    rrDefault: 2.0,
    rrMin: 1.5,
    rrMax: 5.0,
    widthMinTicks: 6,
    widthMinATR: 0.3,
    widthMaxATR: 3.0,
    minRiskTicks: 3,
    ...params,
  };
  if (barsRth.length < P.orMinutes + 2) return [];

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
      ? pricePlusTicks(orHigh, +1, tick.tickSize)
      : pricePlusTicks(orLow, -1, tick.tickSize);
  let stop =
    side === 'BUY'
      ? pricePlusTicks(orLow, -1, tick.tickSize)
      : pricePlusTicks(orHigh, +1, tick.tickSize);

  let riskTicks = ticksBetween(entry, stop, tick.tickSize);
  if (riskTicks < (P.minRiskTicks ?? 3)) {
    // enforce minimum risk ticks to avoid micro boxes
    const adj = (P.minRiskTicks ?? 3) - riskTicks;
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
