export type StrategyKey = 'vwap-first-touch' | 'opening-session-breakout';
export type VwapFirstTouchParams = {
  slopeLookback: number;
  minDistanceATR: number;
  stopKATR: number;
  rrDefault: number;
  rrMin: number;
  rrMax: number;
  minStopTicks: number;
  warmupBars: number;
  maxTouchKATR: number;
  entryOffsetTicks: number;
};
export type OpeningSessionBreakoutParams = {
  orMinutes: number;
  requireCloseBreak: boolean;
  rrDefault: number;
  rrMin: number;
  rrMax: number;
  widthMinTicks: number;
  widthMinATR: number;
  widthMaxATR: number;
  minRiskTicks: number;
  entryOffsetTicks: number;
  stopOffsetTicks: number;
  postOrBars: number;
};
export declare function loadStrategyConfig<T>(key: StrategyKey): T;
export declare function mergeParams<T>(defaults: T, overrides?: Partial<T>): T;
//# sourceMappingURL=strategy-config.d.ts.map
