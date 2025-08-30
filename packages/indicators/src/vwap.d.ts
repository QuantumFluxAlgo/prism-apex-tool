import type { Bar1m, SessionBoundaryFn } from './types.js';
export interface VwapState {
  sessionKey: string | null;
  cumulativePV: number;
  cumulativeVol: number;
}
export declare function initialVwapState(): VwapState;
export declare function updateVwap(
  state: VwapState,
  bar: Bar1m,
  sessionKey: string,
): {
  state: VwapState;
  vwap: number;
};
export declare function vwapSessionSeries(
  bars: Bar1m[],
  sessionKeyOf: SessionBoundaryFn,
): (number | null)[];
//# sourceMappingURL=vwap.d.ts.map
