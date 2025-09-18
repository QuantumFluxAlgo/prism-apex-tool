export type ComplianceSnapshot = {
  eodState: string;
  stopRequired: boolean;
  rrLeq5: boolean;
  ddHeadroom: boolean;
  halfSize: string | boolean;
  consistencyPolicy: { warnAt: number; failAt: number };
};

// TODO: replace with real API shapes when schema is finalized
export type Ticket = {
  symbol: string;
  contract: string;
  side: string;
  qty: number;
  order: {
    entry: number | string;
    stop: number | string;
    targets: Array<number | string>;
    tif: string;
  };
  reasons?: string[];
};
export const Market: {
  positions: () => Promise<Position[]>;
  orders: () => Promise<Order[]>;
} = {
  positions: async () => [],
  orders: async () => [],
};
export type Position = {
  symbol: string;
  qty: number;
  avgPrice?: number;
  unrealizedPnl?: number;
};
export type Order = {
  id: number | string;
  symbol: string;
  side: string;
  type: string;
  limitPrice?: number;
  stopPrice?: number;
  status: string;
  ocoGroupId?: string | null;
};

const COMPAT_BASE =
  typeof window === 'undefined' ? 'http://localhost:3000/api/compat' : '/api/compat';

const DIRECT_BASE =
  typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin;

async function request(base: string, path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}${text ? `: ${text}` : ''}`);
  }
  return res.json();
}

export const api = {
  get: (path: string) => request(COMPAT_BASE, path),
  tickets: (date: string, cursor?: string) =>
    request(DIRECT_BASE, `/api/tickets?date=${date}&strategy=ORR${cursor ? `&cursor=${cursor}` : ''}`),
  ready: () => request(DIRECT_BASE, '/ready'),
};
