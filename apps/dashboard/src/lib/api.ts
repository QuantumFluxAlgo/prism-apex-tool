import { API_BASE, fetchJson } from './apiBase';

export type SessionFlag = 'NEWS' | 'FOMC' | 'ROLL' | 'HOLIDAY' | 'OTHER';

export type SessionFlagsSummary = {
  flags: SessionFlag[];
  hasNewsFlag: boolean;
};

export type TicketRiskDecision = {
  allowed: boolean;
  reason: string;
  codes: string[];
  maxContractsAllowed: number | null;
  warnings: string[];
};

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

export type OperatorSizing = {
  qty?: number | null;
  contracts?: number | null;
  stakeDollars?: number | null;
};

export type OperatorActionKind =
  | 'ACTIONED'
  | 'ACK'
  | 'DISMISSED'
  | 'SKIPPED'
  | 'MONITORING'
  | 'MONITORED';

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
  reason?: string | null;
  strategy_version?: string | null;
  completed_at_utc?: string | null;
  completed_by?: string | null;
  completed_note?: string | null;
  sessionMetrics?: TicketSessionMetricsSummary | null;
  sessionFlags?: SessionFlagsSummary | null;
  riskDecision?: TicketRiskDecision | null;
  operatorSizing?: OperatorSizing | null;
  pnlAmount?: number | null;
  pnlRatio?: number | null;
  contracts?: number | null;
  riskDollars?: number | null;
  rewardDollars?: number | null;
  rrMultiple?: number | null;
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

export const api = {
  get: (path: string) => fetchJson(`/api/compat${path}`),
  tickets: (date: string, cursor?: string) =>
    fetchJson(`/api/tickets?date=${date}&strategy=ORR${cursor ? `&cursor=${cursor}` : ''}`),
  ready: () => fetchJson('/ready'),
};

export async function fetchSymbols(): Promise<string[]> {
  const fallback = [
    'ES=F',
    'MES=F',
    'NQ=F',
    'MNQ=F',
    'YM=F',
    'RTY=F',
    'GC=F',
    'CL=F',
    '6E=F',
    'EURUSD=X',
    '^GDAXI',
  ];
  try {
    const res = (await fetchJson('/api/symbols')) as { symbols?: unknown };
    const symbols = (res as any).symbols;
    if (Array.isArray(symbols) && symbols.length) {
      return symbols as string[];
    }
  } catch {
    // ignore and return fallback
  }
  return fallback;
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
  const url = new URL('/api/tickets', API_BASE);
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

  const data = (await fetchJson(url.toString())) as TicketsResponse;
  return {
    total: typeof data.total === 'number' ? data.total : data.rows?.length ?? 0,
    rows: Array.isArray(data.rows) ? data.rows : [],
  };
}

export async function completeTicket(id: string, body: { user?: string; note?: string }) {
  const json = (await fetchJson(`/api/tickets/${encodeURIComponent(id)}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })) as { row: TicketRow };
  return json.row;
}

export async function recordOperatorAction(ticketId: string, action: OperatorActionKind, note?: string) {
  const url = `${API_BASE}/api/tickets/${encodeURIComponent(ticketId)}/operator-action`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ action, note: note ?? undefined }),
  });

  if (res.status === 204) {
    return;
  }

  let message = `Operator action failed (${res.status})`;
  try {
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.error === 'string') {
          message = parsed.error;
        } else {
          message = text;
        }
      } catch {
        message = text;
      }
    }
  } catch {
    // ignore parse errors
  }

  throw new Error(message);
}

// ---- symbols v2 (config-backed) ----
export type SymbolSpecV2 = {
  symbol: string;
  description?: string;
  tickSize: number | null;
  tickValueUSD: number | null;
  contractType: 'standard' | 'micro' | 'spot' | 'index';
  feedAvailable: boolean;
  tickSpecVerified: boolean;
};

export async function getSymbolSpecsV2(): Promise<SymbolSpecV2[]> {
  const data = (await fetchJson('/api/symbols/v2')) as { symbols?: unknown[] };
  return Array.isArray((data as any).symbols) ? ((data as any).symbols as SymbolSpecV2[]) : [];
}

// Compact SessionMetrics summary attached to each ticket row (Phase 1 Step 1.8b).
export interface TicketSessionMetricsSummary {
  status: 'OK' | 'ERROR';
  orWidth: number | null;
  orToAtrRatio: number | null;
  vwapSlopeClassification: 'UP' | 'DOWN' | 'FLAT' | null;
}
