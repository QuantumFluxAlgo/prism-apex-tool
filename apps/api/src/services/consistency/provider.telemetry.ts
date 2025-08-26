import type { PnlProvider } from './provider.js';
import { telemetryStore } from '../../store/telemetry.js';

export function createTelemetryPnlProvider(): PnlProvider {
  return {
    async getDailyPnL(accountId: string, start: string, end: string) {
      const map = telemetryStore.dailyPnl.get(accountId);
      if (!map) return [];
      const res: { date: string; net: number }[] = [];
      const s = new Date(start);
      const e = new Date(end);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        const net = map.get(key);
        if (net != null) res.push({ date: key, net });
      }
      return res;
    },
  };
}
