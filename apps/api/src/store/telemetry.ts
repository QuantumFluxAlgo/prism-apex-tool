import type { TelemetrySnapshot } from '@prism-apex-tool/clients-tradovate/telemetry';

interface AccountInfo {
  balance: number;
  buyingPower?: number;
  bufferCleared: boolean;
}
interface Position {
  contract: string;
  symbolRoot: string;
  qty: number;
  avgPrice: number;
  unrealizedPnL?: number;
}
interface Fill {
  contract: string;
  side: 'BUY' | 'SELL';
  qty: number;
  price: number;
  ts: string;
}

export const telemetryStore = {
  accounts: new Map<string, AccountInfo>(),
  positions: new Map<string, Position[]>(),
  fills: new Map<string, Fill[]>(),
  dailyPnl: new Map<string, Map<string, number>>(),
};

export function applySnapshot(s: TelemetrySnapshot) {
  for (const a of s.accounts) {
    telemetryStore.accounts.set(a.accountId, {
      balance: a.balance,
      buyingPower: a.buyingPower,
      bufferCleared: s.bufferCleared,
    });
  }
  telemetryStore.positions.clear();
  for (const p of s.positions) {
    const arr = telemetryStore.positions.get(p.accountId) || [];
    arr.push({
      contract: p.contract,
      symbolRoot: p.symbolRoot,
      qty: p.qty,
      avgPrice: p.avgPrice,
      unrealizedPnL: p.unrealizedPnL,
    });
    telemetryStore.positions.set(p.accountId, arr);
  }
  telemetryStore.fills.clear();
  for (const f of s.fills) {
    const arr = telemetryStore.fills.get(f.accountId) || [];
    arr.push({ contract: f.contract, side: f.side, qty: f.qty, price: f.price, ts: f.ts });
    telemetryStore.fills.set(f.accountId, arr);
  }
  const accountId = s.accounts[0]?.accountId;
  if (accountId) {
    const map = telemetryStore.dailyPnl.get(accountId) || new Map<string, number>();
    for (const d of s.dailyPnL) {
      map.set(d.date, d.net);
    }
    const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
    telemetryStore.dailyPnl.set(accountId, new Map(entries));
  }
}

export function getAccount(id: string) {
  return telemetryStore.accounts.get(id);
}
export function getPositions(id: string) {
  return telemetryStore.positions.get(id) || [];
}
export function getFills(id: string, date?: string) {
  const arr = telemetryStore.fills.get(id) || [];
  if (!date) return arr;
  return arr.filter((f) => f.ts.slice(0, 10) === date);
}
