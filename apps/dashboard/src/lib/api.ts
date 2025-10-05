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

export type TicketRow = {
  id?: string | number;
  symbol: string;
  strategy: string;
  direction: 'LONG' | 'SHORT' | string;
  status?: 'OPEN' | 'CLOSED' | 'COMPLETE';
  session_date_utc?: string | null;
  opened_at_utc: string | null;
  closed_at_utc: string | null;
  entry_price: number | null;
  exit_price: number | null;
  pnl: number | null;
  stop_price?: number | null;
  target_price?: number | null;
  meta?: Record<string, unknown>;
  rr?: number | null;
  actionable?: boolean | null;
  meets_strategy_params?: boolean | null;
  meets_apex_rules?: boolean | null;
  is_duplicate?: boolean | null;
  reasons?: string[] | null;
  strategy_version?: string | null;
  completed_at_utc?: string | null;
  completed_by?: string | null;
  completed_note?: string | null;
};

export type TicketsResponse = {
  total?: number;
  rows?: TicketRow[];
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
    request(
      DIRECT_BASE,
      `/api/tickets?date=${date}&strategy=ORR${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  ready: () => request(DIRECT_BASE, '/ready'),
};

export async function fetchSymbols(): Promise<string[]> {
  const res = await request(DIRECT_BASE, '/api/symbols');
  if (Array.isArray((res as any).symbols)) {
    return (res as any).symbols as string[];
  }
  return [];
}

export async function fetchTickets(params: {
  from?: string;
  to?: string;
  symbol?: string;
  strategy?: string;
  status?: string;
  scope?: string;
  direction?: string;
  limit?: number;
  offset?: number;
}): Promise<TicketsResponse> {
  const base = typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin;
  const url = new URL('/api/tickets', base);
  const search = url.searchParams;

  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.symbol && params.symbol !== 'ALL') search.set('symbol', params.symbol);
  if (params.strategy && params.strategy !== 'ALL') search.set('strategy', params.strategy);
  if (params.status && params.status !== 'ANY' && params.status !== 'ALL') search.set('status', params.status);
  if (params.scope && params.scope !== 'all' && params.scope !== 'ALL') search.set('scope', params.scope);
  if (params.direction && params.direction !== 'ALL') search.set('direction', params.direction);

  search.set('limit', String(params.limit ?? 25));
  search.set('offset', String(params.offset ?? 0));

  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed tickets: ${response.status}${text ? ` ${text}` : ''}`);
  }

  const data = (await response.json()) as TicketsResponse;
  return {
    total: typeof data.total === 'number' ? data.total : data.rows?.length ?? 0,
    rows: Array.isArray(data.rows) ? data.rows : [],
  };
}

export async function completeTicket(id: string, body: { user?: string; note?: string }) {
  const res = await fetch(`/api/tickets/${encodeURIComponent(id)}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.row as TicketRow;
}
