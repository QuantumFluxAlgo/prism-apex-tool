export type DailyRiskSnapshotDto = {
  dateUtc: string;
  dailyStartingBalance: number | null;
  maxDailyDrawdownPct: number | null;
  maxDailyLossAmount: number | null;
  realisedPnL: number;
  openRisk: number;
  drawdownAmount: number;
  remainingRiskCapacity: number | null;
  isLockedOut: boolean | null;
};
