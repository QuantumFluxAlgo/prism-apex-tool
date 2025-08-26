import type { PnlProvider } from './provider.js';

export function createMockPnlProvider() {
  const data = new Map<string, number>();
  return {
    getDailyPnL(accountId: string, start: string, end: string) {
      const res: { date: string; net: number }[] = [];
      const startDate = new Date(start);
      const endDate = new Date(end);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const key = accountId + dateStr;
        const net = data.get(key);
        if (net != null) res.push({ date: dateStr, net });
      }
      return Promise.resolve(res);
    },
    upsert(accountId: string, date: string, net: number) {
      data.set(accountId + date, net);
    },
  } satisfies PnlProvider & { upsert: (accountId: string, date: string, net: number) => void };
}
