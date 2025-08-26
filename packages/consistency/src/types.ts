export type DayPnL = { date: string; net: number }; // YYYY-MM-DD, USD
export type ConsistencyConfig = {
  windowDays: number; // default 8
  minProfitDays: number; // default 5
  minDayPnL: number; // default 50
  topDayMaxShare: number; // default 0.30
};
export type ConsistencyResult = {
  window: { start: string; end: string };
  totals: { net: number; days: number; profitDays: number };
  topDay: { date: string | null; net: number; share: number };
  passed: boolean;
  reasons: string[]; // e.g. ["topday>30%", "profitDays<5", "noData"]
};
