export type TickSpec = { tickSize: number; minStopTicks?: number };
export type VwapSeries = number[]; // aligned to bars
export type AtrSeries = number[];  // ATR in price units; pass ticks via tickSpec if needed

export type VwapFtParams = {
  slopeLookback: number;        // default 10 bars
  minDistanceATR: number;       // default 0.5
  stopKATR: number;             // default 0.25
  rrDefault: number;            // default 2.0
  rrMin: number;                // default 1.5
  rrMax: number;                // default 3.0 (VWAP FT clamp)
  minStopTicks?: number;        // default 2
};

export type OsbParams = {
  orMinutes: number;            // default 5
  requireCloseBreak: boolean;   // default true
  rrDefault: number;            // default 2.0
  rrMin: number;                // default 1.5
  rrMax: number;                // default 5.0
  widthMinTicks: number;        // default 6
  widthMinATR: number;          // default 0.3
  widthMaxATR: number;          // default 3.0
  minRiskTicks?: number;        // default 3 (slippage buffer)
};
