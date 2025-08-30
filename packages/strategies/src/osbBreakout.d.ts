import { Candle, Suggestion } from './types.js';
import { AtrSeries, TickSpec } from './inputs.js';
import { OpeningSessionBreakoutParams } from './config/strategy-config.js';
/** Opening Swing Breakout over first N minutes of RTH */
export declare function openingSwingBreakout(
  symbol: string,
  barsRth: Candle[],
  atrSeries: AtrSeries,
  tick: TickSpec,
  params?: Partial<OpeningSessionBreakoutParams>,
  nowIso?: string,
): Suggestion[];
//# sourceMappingURL=osbBreakout.d.ts.map
