import { login } from './auth.js';
import { TradovateClientError } from './types.js';
export function createTelemetryClient(env, opts) {
  const pollMs = opts?.pollMs ?? 5000;
  let token = null;
  let timer = null;
  async function fetchJson(path) {
    if (!token || token.expiresAt < Date.now()) {
      token = await login(env);
    }
    const resp = await fetch(`${env.restBase}${path}`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!resp.ok) throw new TradovateClientError(`telemetry ${resp.status}`);
    return resp.json();
  }
  async function poll(onSnapshot) {
    const today = new Date().toISOString().slice(0, 10);
    const [accountsRaw, positionsRaw, fillsRaw] = await Promise.all([
      fetchJson('/account/list'),
      fetchJson('/position/list'),
      fetchJson(`/fill/list?d=${today}`),
    ]);
    const accounts = (Array.isArray(accountsRaw) ? accountsRaw : []).map((a) => ({
      accountId: String(a.id ?? a.accountId ?? ''),
      balance: Number(a.balance ?? 0),
      buyingPower: a.buyingPower != null ? Number(a.buyingPower) : undefined,
    }));
    const positions = (Array.isArray(positionsRaw) ? positionsRaw : []).map((p) => ({
      accountId: String(p.accountId ?? ''),
      contract: String(p.contract ?? p.contractId ?? ''),
      symbolRoot: String(p.symbol ?? p.symbolRoot ?? ''),
      qty: Number(p.netPos ?? p.qty ?? 0),
      avgPrice: Number(p.avgPrice ?? 0),
      unrealizedPnL: p.unrealizedPnl != null ? Number(p.unrealizedPnl) : undefined,
    }));
    const fills = (Array.isArray(fillsRaw) ? fillsRaw : []).map((f) => ({
      accountId: String(f.accountId ?? ''),
      contract: String(f.contractId ?? f.contract ?? ''),
      side: String(f.side ?? ''),
      qty: Number(f.quantity ?? f.qty ?? 0),
      price: Number(f.price ?? 0),
      ts: new Date(f.timestamp ?? f.ts ?? Date.now()).toISOString(),
    }));
    const pnlMap = new Map();
    for (const f of fills) {
      const day = f.ts.slice(0, 10);
      const sign = f.side === 'BUY' ? -1 : 1;
      pnlMap.set(day, (pnlMap.get(day) || 0) + sign * f.price * f.qty);
    }
    const dailyPnL = Array.from(pnlMap.entries()).map(([date, net]) => ({ date, net }));
    const realized = dailyPnL.reduce((sum, d) => sum + d.net, 0);
    const snap = {
      accounts,
      positions,
      // Coerce broker fill sides to strict 'BUY' | 'SELL' union
      fills: fills.map((f) => ({
        ...f,
        side: String(f.side).toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
      })),
      dailyPnL,
      bufferCleared: realized >= env.bufferThreshold,
    };
    onSnapshot(snap);
  }
  return {
    start(onSnapshot) {
      void poll(onSnapshot);
      timer = setInterval(() => void poll(onSnapshot), pollMs);
      return {
        stop() {
          if (timer) clearInterval(timer);
        },
      };
    },
  };
}
