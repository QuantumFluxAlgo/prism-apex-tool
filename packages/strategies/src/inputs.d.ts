export type TickSpec = {
  tickSize: number;
  minStopTicks?: number;
};
export type VwapSeries = number[];
export type AtrSeries = number[];
export type VwapFtParams = {
  slopeLookback: number;
  minDistanceATR: number;
  stopKATR: number;
  rrDefault: number;
  rrMin: number;
  rrMax: number;
  minStopTicks?: number;
};
export type OsbParams = {
  orMinutes: number;
  requireCloseBreak: boolean;
  rrDefault: number;
  rrMin: number;
  rrMax: number;
  widthMinTicks: number;
  widthMinATR: number;
  widthMaxATR: number;
  minRiskTicks?: number;
};
//# sourceMappingURL=inputs.d.ts.map
