import type { CanonicalTicket } from '@prism-apex/shared';
import type { CanonicalApprovedTicketView } from './dto/canonicalTicketView';
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

/**
 * CanonicalTicket (camelCase) is the authoritative shape. snake_case fields
 * below are derived for the legacy Worklist UI and will disappear once V2 ships.
 */
export interface TicketRow extends CanonicalTicket, Record<string, unknown> {
  /** Legacy strategy display (maps to CanonicalTicket.strategyId). */
  strategy: string;
  /** Legacy direction field retained until Worklist migrates to CanonicalTicket.side. */
  direction?: CanonicalTicket['side'] | string;
  session_date_utc?: CanonicalTicket['sessionDateUtc'] | null;
  opened_at_utc?: CanonicalTicket['createdAtUtc'] | null;
  closed_at_utc?: CanonicalTicket['completedAtUtc'] | null;
  entry_price?: CanonicalTicket['entryPrice'] | null;
  exit_price?: CanonicalTicket['exitPrice'] | null;
  stop_price?: CanonicalTicket['stopPrice'] | null;
  target_price?: CanonicalTicket['targetPrice'] | null;
  meta?: Record<string, unknown>;
  rr?: number | null;
  actionable?: boolean | null;
  meets_strategy_params?: boolean | null;
  meets_apex_rules?: boolean | null;
  is_duplicate?: boolean | null;
  reasons?: string[] | null;
  reason?: string | null;
  strategy_version?: CanonicalTicket['strategyVersion'];
  completed_at_utc?: CanonicalTicket['completedAtUtc'];
  completed_by?: CanonicalTicket['completedBy'];
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
  canonicalCandidate?: CanonicalTicket | null;
  canonicalApproved?: CanonicalApprovedTicketView | null;
}

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

export async function fetchMarketActivity(): Promise<TicketRow[]> {
  const data = (await fetchJson('/api/activity')) as TicketsResponse;
  return Array.isArray(data.rows) ? data.rows : [];
}

export async function fetchComplianceSnapshot(): Promise<ComplianceSnapshot> {
  return (await fetchJson('/api/compliance')) as ComplianceSnapshot;
}

export async function fetchLiveTickets(): Promise<TicketRow[]> {
  const data = (await fetchJson('/api/tickets/live')) as TicketsResponse;
  return Array.isArray(data.rows) ? data.rows : [];
}

export async function fetchTicketDetail(id: string): Promise<Ticket | null> {
  const res = (await fetchJson(`/api/tickets/${encodeURIComponent(id)}`)) as { ticket?: Ticket };
  return res.ticket ?? null;
}

export async function fetchTicketHistory(): Promise<TicketRow[]> {
  const data = (await fetchJson('/api/tickets/history')) as TicketsResponse;
  return Array.isArray(data.rows) ? data.rows : [];
}

export async function fetchTicketAlerts(): Promise<any[]> {
  return (await fetchJson('/api/tickets/alerts')) as any[];
}

export async function fetchTicketRecipients(): Promise<any> {
  return fetchJson('/api/tickets/recipients');
}

export async function addTicketRecipients(update: Partial<{ email: string[]; telegram: string[]; slack: string[]; sms: string[] }>) {
  const res = await fetch(`${API_BASE}/api/tickets/recipients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Failed to update recipients');
  return res.json();
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

function buildCanonicalTicketFromRow(row: TicketRow): CanonicalTicket | null {
  if (row.canonicalApproved) {
    const view = row.canonicalApproved;
    return {
      id: view.ticketId,
      symbol: view.symbol,
      sessionDateUtc: view.sessionDateUtc,
      side: view.side,
      entryPrice: view.entryPrice,
      stopPrice: view.stopPrice,
      targetPrice: view.targetPrice,
      exitPrice: row.exitPrice ?? row.exit_price ?? null,
      entryTicksFromRef: null,
      stopTicks: view.stopTicks,
      targetTicks: view.targetTicks,
      quantity: view.quantity,
      perContractRisk: view.perContractRisk,
      totalRisk: view.totalRisk,
      expectedReward: view.expectedReward,
      rrMultiple: view.rrMultiple,
      pnl: view.pnl ?? row.pnl ?? row.pnlAmount ?? null,
      pnlRMultiple: view.pnlRMultiple ?? row.pnlRatio ?? null,
      strategyId: view.strategyId,
      strategyVersion: view.strategyVersion ?? null,
      contextRegime: view.contextRegime ?? null,
      contextAtrBucket: view.contextAtrBucket ?? null,
      contextOrType: view.contextOrType ?? null,
      tags: view.tags ?? undefined,
      status: (view.status as CanonicalTicket['status']) ?? (row.status as CanonicalTicket['status']),
      createdAtUtc: view.createdAtUtc,
      updatedAtUtc: row.updatedAtUtc ?? view.finalizedAtUtc ?? view.createdAtUtc,
      completedAtUtc: view.finalizedAtUtc ?? row.completedAtUtc ?? null,
      completedBy: row.completedBy ?? null,
      accountId: row.accountId ?? null,
      notes: row.notes ?? null,
      source: view.source ?? row.source,
    };
  }

  const entry = row.entryPrice ?? row.entry_price ?? null;
  const stop = row.stopPrice ?? row.stop_price ?? null;
  const target = row.targetPrice ?? row.target_price ?? null;
  if (entry === null || stop === null || target === null) {
    return null;
  }
  const quantity = row.quantity ?? row.qty ?? 0;
  const perContractRisk = Math.abs(entry - stop);
  const expectedReward = Math.abs(target - entry);
  const sessionDateUtc =
    row.sessionDateUtc ?? row.session_date_utc ?? row.createdAtUtc ?? row.opened_at_utc ?? new Date().toISOString();

  return {
    id: row.id,
    symbol: row.symbol,
    sessionDateUtc,
    side: row.side,
    entryPrice: entry,
    stopPrice: stop,
    targetPrice: target,
    exitPrice: row.exitPrice ?? row.exit_price ?? null,
    entryTicksFromRef: null,
    stopTicks: perContractRisk || 1,
    targetTicks: expectedReward || 1,
    quantity,
    perContractRisk,
    totalRisk: perContractRisk * Math.max(quantity, 1),
    expectedReward: expectedReward * Math.max(quantity, 1),
    rrMultiple: row.rrMultiple ?? row.rr ?? 1,
    pnl: row.pnl ?? row.pnlAmount ?? null,
    pnlRMultiple: row.pnlRatio ?? null,
    strategyId: row.strategyId,
    strategyVersion: row.strategyVersion ?? null,
    contextRegime: row.contextRegime ?? null,
    contextAtrBucket: row.contextAtrBucket ?? null,
    contextOrType: row.contextOrType ?? null,
    tags: row.tags ?? undefined,
    status: row.status as CanonicalTicket['status'],
    createdAtUtc: row.createdAtUtc,
    updatedAtUtc: row.updatedAtUtc,
    completedAtUtc: row.completedAtUtc,
    completedBy: row.completedBy ?? null,
    accountId: row.accountId ?? null,
    notes: row.notes ?? null,
    source: row.source,
  };
}

export async function fetchWorklistCanonicalTickets(): Promise<CanonicalTicket[]> {
  const { rows } = await fetchTickets({ scope: 'actionable', limit: 100 });
  if (!rows) return [];
  return rows
    .map((row) => buildCanonicalTicketFromRow(row))
    .filter((ticket): ticket is CanonicalTicket => Boolean(ticket));
}

export type AnalyticsTicketsParams = {
  from?: string;
  to?: string;
  symbol?: string;
  strategy?: string;
  limit?: number;
  status?: string;
};

export async function fetchAnalyticsCanonicalTickets(params: AnalyticsTicketsParams = {}): Promise<CanonicalTicket[]> {
  const { rows } = await fetchTickets({
    from: params.from,
    to: params.to,
    symbol: params.symbol,
    strategy: params.strategy,
    status: params.status ?? 'COMPLETED',
    scope: 'all',
    limit: params.limit ?? 250,
  });
  if (!rows) return [];
  return rows
    .map((row) => buildCanonicalTicketFromRow(row))
    .filter((ticket): ticket is CanonicalTicket => Boolean(ticket));
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

export interface SessionMetricsDto {
  symbol: string;
  sessionDate: string;
  sessionType: string;
  sessionStartTs: string | null;
  sessionEndTs: string | null;
  sessionAtrPoints: number | null;
  sessionAtrBucket: string | null;
  intradayRangePoints: number | null;
  overnightRangePoints: number | null;
  volRegime: string | null;
  orStartTs: string | null;
  orEndTs: string | null;
  orLengthMinutes: number | null;
  orHigh: number | null;
  orLow: number | null;
  orWidthPoints: number | null;
  orWidthToAtrRatio: number | null;
  vwapOpenValue: number | null;
  vwapCloseValue: number | null;
  vwapSlope: string | null;
  priceVsVwapAtOrEnd: string | null;
  htfTrendBias: string | null;
  avgVolumeFirst30m: number | null;
  volumeSpikeFlag: boolean | null;
  liquidityRegime: string | null;
  hasMajorNewsToday: boolean | null;
  newsWindow: string | null;
  newsLabel: string | null;
  sessionQualityFlag: string | null;
  sessionSkipReason: string | null;
  barsAnalyzed: number;
  status: 'OK' | 'ERROR';
  errorCode: string | null;
  errorMessage: string | null;
  computedAt: string;
  version: string;
}

export function makeSessionMetricsKey(symbol: string, sessionDate?: string | null) {
  return `${symbol}__${sessionDate ?? ''}`;
}

export async function fetchSessionMetrics(symbol: string, sessionDate: string): Promise<SessionMetricsDto | null> {
  const params = new URLSearchParams({ symbol, sessionDate });
  try {
    const res = (await fetchJson(`/api/session-metrics?${params.toString()}`)) as SessionMetricsDto;
    return res;
  } catch {
    return null;
  }
}

export type SessionMetricsBatchRequest = {
  symbol: string;
  sessionDate: string;
};

export async function fetchSessionMetricsBatch(
  requests: SessionMetricsBatchRequest[],
): Promise<Record<string, SessionMetricsDto | null>> {
  if (!requests.length) {
    return {};
  }
  const deduped = new Map<string, SessionMetricsBatchRequest>();
  requests.forEach((request) => {
    if (!request.sessionDate) return;
    const key = makeSessionMetricsKey(request.symbol, request.sessionDate);
    if (!deduped.has(key)) {
      deduped.set(key, request);
    }
  });
  const entries = await Promise.all(
    Array.from(deduped.entries()).map(async ([key, request]) => {
      const metrics = await fetchSessionMetrics(request.symbol, request.sessionDate);
      return [key, metrics ?? null] as const;
    }),
  );
  return entries.reduce<Record<string, SessionMetricsDto | null>>((acc, [key, metrics]) => {
    acc[key] = metrics;
    return acc;
  }, {});
}

export type JobStatusDto = {
  name: string;
  everyMs: number;
  running: boolean;
  lastRunUtc: string | null;
  lastOk: boolean | null;
  lastError: string | null;
  lastDurationMs: number | null;
};

export async function fetchJobStatus(): Promise<JobStatusDto[]> {
  const data = (await fetchJson('/api/system/jobs')) as unknown;
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((entry) => ({
    name: typeof entry.name === 'string' ? entry.name : 'unknown',
    everyMs: Number(entry.everyMs) || 0,
    running: Boolean(entry.running),
    lastRunUtc: typeof entry.lastRunUtc === 'string' ? entry.lastRunUtc : null,
    lastOk: typeof entry.lastOk === 'boolean' ? entry.lastOk : null,
    lastError: typeof entry.lastError === 'string' ? entry.lastError : null,
    lastDurationMs: typeof entry.lastDurationMs === 'number' ? entry.lastDurationMs : null,
  }));
}

export type OperatorConfigDto = {
  dailyStartingBalance: number | null;
  maxDailyDrawdownPct: number | null;
  updatedAtUtc: string;
};

export async function fetchOperatorConfig(): Promise<OperatorConfigDto> {
  const res = await fetch('/api/operator-config');
  if (!res.ok) {
    throw new Error(`Failed to load operator config (${res.status})`);
  }
  return (await res.json()) as OperatorConfigDto;
}

export async function updateOperatorConfig(
  patch: { dailyStartingBalance?: number | null; maxDailyDrawdownPct?: number | null },
): Promise<OperatorConfigDto> {
  const res = await fetch('/api/operator-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Failed to update operator config (${res.status})`);
  }
  return (await res.json()) as OperatorConfigDto;
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
