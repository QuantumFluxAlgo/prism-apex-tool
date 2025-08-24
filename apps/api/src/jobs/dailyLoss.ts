import type { JobFn } from './scheduler';
import { store } from '../store';

export const jobDailyLoss: JobFn = () => {
  const rc = store.getRiskContext();
  if (rc.todayProfit > 0) {
    store.setTodayProfit(Math.max(rc.todayProfit, 0));
  }
};
