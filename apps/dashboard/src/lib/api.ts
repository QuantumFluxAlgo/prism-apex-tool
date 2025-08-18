export type SymbolCode = 'ES' | 'NQ' | 'MES' | 'MNQ';

export interface Ticket {
  id: string;
  symbol: SymbolCode;
  contract: string;
  side: 'BUY' | 'SELL';
  qty: number;
  order: {
    type: 'LIMIT' | 'MARKET';
    entry: number;
    stop: number;
    targets: number[];
    tif: 'DAY';
    oco: true;
  };
  risk: {
    perTradeUsd: number;
    rMultipleByTarget: number[];
  };
  apex: {
    stopRequired: boolean;
    rrLeq5: boolean;
    ddHeadroom: boolean;
    halfSize: boolean;
    eodReady: boolean;
    consistency30: 'OK' | 'WARN' | 'FAIL';
  };
  notes?: string;
}

export type ComplianceSnapshot = {
  stopRequired: boolean;
  rrLeq5: boolean;
  ddHeadroom: boolean;
  halfSize: string | boolean;
  consistencyPolicy: { warnAt: number; failAt: number };
  eodState: 'OK' | 'BLOCK_NEW';
};

export interface AccountInfo {
  netLiq: number;
  cash: number;
  margin: number;
  dayPnlRealized: number;
  dayPnlUnrealized: number;
}

export interface Position {
  symbol: string;
  qty: number;
  avgPrice: number;
  unrealizedPnl: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  limitPrice?: number;
  stopPrice?: number;
  status: string;
  ocoGroupId?: string;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const Market = {
  account: () => api<AccountInfo>('/account'),
  positions: () => api<Position[]>('/positions'),
  orders: () => api<Order[]>('/orders'),
};

export const Rules = {
  status: () => api<ComplianceSnapshot>('/rules/status'),
};

export const Signals = {
  preview: (payload: Record<string, unknown>) =>
    api<{ ticket: Ticket | null; block: boolean; reasons: string[] }>('/signals/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const Tickets = {
  commit: (ticket: Ticket) =>
    api<{ ok: boolean; reasons?: string[] }>('/tickets/commit', {
      method: 'POST',
      body: JSON.stringify({ ticket }),
    }),
};

