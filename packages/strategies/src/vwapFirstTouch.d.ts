import { Candle, Suggestion } from './types.js';
import { VwapSeries, AtrSeries, TickSpec } from './inputs.js';
import { VwapFirstTouchParams } from './config/strategy-config.js';
/**
 * Assumes bars are RTH-filtered for the session and vwapSeries resets at session open.
 * Emits at most one suggestion for the first clean touch after a trend leg with slope filter.
 */
export declare function vwapFirstTouch(
  symbol: string,
  bars: Candle[],
  vwapSeries: VwapSeries,
  atrSeries: AtrSeries,
  tick: TickSpec,
  params?: Partial<VwapFirstTouchParams>,
  nowIso?: string,
): Suggestion[];
//# sourceMappingURL=vwapFirstTouch.d.ts.map
