import type { PnlProvider } from './provider.js';

export function createMockPnlProvider() {
  const data = new Map<string, number>();
  return {
    async getDailyNetPnl(accountId: string, startIso: string, endIso: string) {
      const res: Array<{ date: string; net: number }> = [];
      const startDate = new Date(startIso);
      const endDate = new Date(endIso);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const key = accountId + dateStr;
        const net = data.get(key);
        if (net != null) res.push({ date: dateStr, net });
      }
      return res;
    },
    async upsert(accountId: string, date: string, net: number): Promise<void> {
      data.set(accountId + date, net);
    },
  } satisfies PnlProvider;
}
