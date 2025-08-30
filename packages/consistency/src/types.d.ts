export type DayPnL = {
  date: string;
  net: number;
};
export type ConsistencyConfig = {
  windowDays: number;
  minProfitDays: number;
  minDayPnL: number;
  topDayMaxShare: number;
};
export type ConsistencyResult = {
  window: {
    start: string;
    end: string;
  };
  totals: {
    net: number;
    days: number;
    profitDays: number;
  };
  topDay: {
    date: string | null;
    net: number;
    share: number;
  };
  passed: boolean;
  reasons: string[];
};
//# sourceMappingURL=types.d.ts.map
