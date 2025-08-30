import type { Bar1m, TickSpec } from './types.js';
export declare function trueRange(curr: Bar1m, prevClose?: number): number;
export declare function atrWilderSeries(
  bars: Bar1m[],
  period?: number,
  opts?: {
    asTicks?: boolean;
    tickSpec?: TickSpec;
  },
): (number | null)[];
//# sourceMappingURL=atr.d.ts.map
