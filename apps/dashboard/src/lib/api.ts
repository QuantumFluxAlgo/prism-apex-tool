import type { CanonicalTicket } from '@prism-apex/shared';
import type { CanonicalApprovedTicketView } from './dto/canonicalTicketView';
import { API_BASE, fetchJson } from './apiBase';

/**
 * Session flags & metrics
 */

export type SessionFlag = 'NEWS' | 'FOMC' | 'ROLL' | 'HOLIDAY' | 'OTHER';

export type SessionFlagsSummary = {
  flags: SessionFlag[];
  hasNewsFlag: boolean;
};

/**
 * UI-facing snapshot of session metrics used across Worklist, Tickets, Analytics.
 * This is intentionally loose; it mirrors the main fields used in the UI.
 */
export type SessionMetricsDto = {
  status?: string;
  symbol?: string | null;
  sessionDate?: string | null;

  // Opening Range structure
  orHigh?: number | null;
  orLow?: number | null;
  orWidthPoints?: number | null;

  // Volatility / ATR structure
  sessionAtrPoints?: number | null;
  orWidthToAtrRatio?: number | null;

  // Trend / VWAP / regime
  vwapSlope?: string | null;
  htfTrendBias?: string | null;
  volRegime?: string | null;

  // News / event labelling
  hasMajorNewsToday?: boolean | null;
  newsLabel?: string | null;

  // Overall quality / skip reasons
  sessionQualityFlag?: string | null;
  sessionSkipReason?: string | null;

  // Allow backend to add more without breaking the UI
  [key: string]: unknown;
};

/**
 * Ticket-level summary flavour of session metrics.
 * Currently an alias of SessionMetricsDto for simplicity.
 */
export type TicketSessionMetricsSummary = SessionMetricsDto;

/**
 * Risk / compliance DTOs
 */

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

/**
 * UI Ticket detail (non-canonical order detail used in the Tickets drilldown)
 */

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
 * TicketRow = server payload row from /api/tickets.
 * It *extends* CanonicalTicket but should not be treated as canonical until
 * passed through buildCanonicalTicketFromRow.
 */
export interface TicketRow extends CanonicalTicket, Record<string, unknown> {
  /** Legacy strategy display (maps to CanonicalTicket.strategyId). */
  strategy: string;

  /** Legacy direction field retained until Worklist migrates fully to CanonicalTicket.side. */
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

  // allow extra fields without breaking the UI
  [key: string]: unknown;
}

export type TicketsResponse = {
  total?: number;
  rows?: TicketRow[];
};

/**
 * Simple market position/order placeholders – currently unused by V2 pages.
 */

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

export const Market: {
  positions: () => Promise<Position[]>;
  orders: () => Promise<Order[]>;
} = {
  positions: async () => [],
  orders: async () => [],
};

/**
 * Shared helpers
 */

export async function fetchMarketActivity(): Promise<TicketRow[]> {
  const data = (await fetchJson('/api/activity')) as TicketsResponse;
  return Array.isArray(data.rows) ? data.rows : [];
}

export async function fetchComplianceSnapshot(): Promise<ComplianceSnapshot> {
  return (await fetchJson('/api/compliance')) as ComplianceSnapshot;
}

/**
 * LEGACY: prefer fetchTickets(...) + canonical mapping.
 * Kept for V1/legacy surfaces only.
 */
export async function fetchLiveTickets(): Promise<TicketRow[]> {
  const data = (await fetchJson('/api/tickets/live')) as TicketsResponse;
  return Array.isArray(data.rows) ? data.rows : [];
}

/**
 * Detailed ticket info (non-canonical order fields for the Tickets drilldown).
 */
export async function fetchTicketDetail(id: string): Promise<Ticket | null> {
  const res = (await fetchJson(`/api/tickets/${encodeURIComponent(id)}`)) as {
    ticket?: Ticket;
  };
  return res.ticket ?? null;
}

/**
 * LEGACY: prefer fetchTickets(...) + useTicketsHistory for history.
 */
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

export async function addTicketRecipients(
  update: Partial<{
    email: string[];
    telegram: string[];
    slack: string[];
    sms: string[];
  }>,
) {
  const res = await fetch(`${API_BASE}/api/tickets/recipients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Failed to update recipients');
  return res.json();
}

/**
 * Resolve a safe base URL for tickets API calls.
 * Falls back to window.location.origin (browser) or http://localhost (tests).
 */
function getTicketsBase(): string {
  const trimmed = API_BASE?.trim();
  if (trimmed) {
    return trimmed;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost';
}

/**
 * Canonical tickets API helper – base building block for all V2 surfaces.
 */
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
  const url = new URL('/api/tickets', getTicketsBase());
  const search = url.searchParams;

  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.symbol && params.symbol !== 'ALL') search.set('symbol', params.symbol);
  if (params.strategy && params.strategy !== 'ALL') search.set('strategy', params.strategy);
  if (params.status && params.status !== 'ANY' && params.status !== 'ALL') {
    search.set('status', params.status);
  }
  if (params.scope && params.scope !== 'all' && params.scope !== 'ALL') {
    search.set('scope', params.scope);
  }
  if (params.direction && params.direction !== 'ALL') {
    search.set('direction', params.direction);
  }

  search.set('limit', String(params.limit ?? 25));
  search.set('offset', String(params.offset ?? 0));

  const data = (await fetchJson(url.toString())) as TicketsResponse;
  return {
    total: typeof data.total === 'number' ? data.total : data.rows?.length ?? 0,
    rows: Array.isArray(data.rows) ? data.rows : [],
  };
}

/**
 * Completes a ticket and returns the updated TicketRow from the API.
 */
export async function completeTicket(
  id: string,
  body: { user?: string; note?: string },
) {
  const json = (await fetchJson(
    `/api/tickets/${encodeURIComponent(id)}/complete`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    },
  )) as { row: TicketRow };
  return json.row;
}

/**
 * Canonical mapping: TicketRow -> CanonicalTicket.
 *
 * This is the single place that understands how to turn the tickets
 * table payload (with canonicalApproved and meta) into the canonical
 * ticket contract consumed by Worklist, Tickets, Analytics.
 */
export function buildCanonicalTicketFromRow(row: TicketRow): CanonicalTicket | null {
  if (row.canonicalApproved) {
    const view = row.canonicalApproved as CanonicalApprovedTicketView;

    const exitPrice =
      (row.exitPrice as number | null | undefined) ??
      (row.exit_price as number | null | undefined) ??
      null;

    const pnl =
      (view as any).pnl ??
      (row.pnl as number | null | undefined) ??
      (row.pnlAmount as number | null | undefined) ??
      null;

    const pnlRMultiple =
      (view as any).pnlRMultiple ??
      (row.pnlRatio as number | null | undefined) ??
      null;

    return {
      id: view.ticketId,
      symbol: view.symbol,
      sessionDateUtc: view.sessionDateUtc,
      side: view.side,
      entryPrice: view.entryPrice,
      stopPrice: view.stopPrice,
      targetPrice: view.targetPrice,
      exitPrice,
      entryTicksFromRef: null,
      stopTicks: view.stopTicks,
      targetTicks: view.targetTicks,
      quantity: view.quantity,
      perContractRisk: view.perContractRisk,
      totalRisk: view.totalRisk,
      expectedReward: view.expectedReward,
      rrMultiple: view.rrMultiple,
      pnl,
      pnlRMultiple,
      strategyId: view.strategyId,
      strategyVersion: view.strategyVersion ?? null,
      contextRegime: view.contextRegime ?? null,
      contextAtrBucket: view.contextAtrBucket ?? null,
      contextOrType: view.contextOrType ?? null,
      tags: view.tags ?? undefined,
      status:
        (view.status as CanonicalTicket['status']) ??
        (row.status as CanonicalTicket['status']),
      createdAtUtc: view.createdAtUtc,
      updatedAtUtc:
        (row.updatedAtUtc as string | null | undefined) ??
        (view.finalizedAtUtc ?? view.createdAtUtc),
      completedAtUtc:
        (view.finalizedAtUtc as string | null | undefined) ??
        (row.completedAtUtc as string | null | undefined) ??
        (row.completed_at_utc as string | null | undefined) ??
        null,
      completedBy:
        (row.completedBy as string | null | undefined) ??
        (row.completed_by as string | null | undefined) ??
        null,
      accountId: (row as any).accountId ?? null,
      notes: (row as any).notes ?? null,
      source: (view as any).source ?? (row as any).source,
    };
  }

  const entry =
    (row.entryPrice as number | null | undefined) ??
    (row.entry_price as number | null | undefined) ??
    null;
  const stop =
    (row.stopPrice as number | null | undefined) ??
    (row.stop_price as number | null | undefined) ??
    null;
  const target =
    (row.targetPrice as number | null | undefined) ??
    (row.target_price as number | null | undefined) ??
    null;

  if (entry === null || stop === null || target === null) {
    return null;
  }

  const quantity =
    (row.quantity as number | null | undefined) ?? (row.qty as number | null | undefined) ?? 0;

  const perContractRisk = Math.abs(entry - stop);
  const expectedReward = Math.abs(target - entry);
  const rrMultiple =
    (row.rrMultiple as number | null | undefined) ??
    (row.rr as number | null | undefined) ??
    null;

  const pnl =
    (row.pnl as number | null | undefined) ??
    (row.pnlAmount as number | null | undefined) ??
    null;

  const pnlRMultiple =
    (row.pnlRMultiple as number | null | undefined) ??
    (row.pnlRatio as number | null | undefined) ??
    null;

  return {
    id: String(row.id ?? ''),
    symbol: row.symbol,
    sessionDateUtc:
      (row.sessionDateUtc as string | null | undefined) ??
      (row.session_date_utc as string | null | undefined) ??
      null,
    side: row.side,
    entryPrice: entry,
    stopPrice: stop,
    targetPrice: target,
    exitPrice:
      (row.exitPrice as number | null | undefined) ??
      (row.exit_price as number | null | undefined) ??
      null,
    entryTicksFromRef: null,
    stopTicks: (row.stopTicks as number | null | undefined) ?? null,
    targetTicks: (row.targetTicks as number | null | undefined) ?? null,
    quantity,
    perContractRisk,
    totalRisk: perContractRisk * quantity,
    expectedReward,
    rrMultiple,
    pnl,
    pnlRMultiple,
    strategyId:
      (row.strategyId as string | null | undefined) ??
      (row.strategy as string | null | undefined) ??
      null,
    strategyVersion:
      (row.strategyVersion as string | null | undefined) ??
      (row.strategy_version as string | null | undefined) ??
      null,
    contextRegime:
      (row.contextRegime as string | null | undefined) ??
      (row.context_regime as string | null | undefined) ??
      null,
    contextAtrBucket:
      (row.contextAtrBucket as string | null | undefined) ??
      (row.context_atr_bucket as string | null | undefined) ??
      null,
    contextOrType:
      (row.contextOrType as string | null | undefined) ??
      (row.context_or_type as string | null | undefined) ??
      null,
    tags: (row.tags as string[] | null | undefined) ?? undefined,
    status: row.status as CanonicalTicket['status'],
    createdAtUtc:
      (row.createdAtUtc as string | null | undefined) ??
      (row.opened_at_utc as string | null | undefined) ??
      null,
    updatedAtUtc:
      (row.updatedAtUtc as string | null | undefined) ??
      (row.closed_at_utc as string | null | undefined) ??
      (row.completed_at_utc as string | null | undefined) ??
      null,
    completedAtUtc:
      (row.completedAtUtc as string | null | undefined) ??
      (row.completed_at_utc as string | null | undefined) ??
      null,
    completedBy:
      (row.completedBy as string | null | undefined) ??
      (row.completed_by as string | null | undefined) ??
      null,
    accountId: (row as any).accountId ?? null,
    notes: (row as any).notes ?? null,
    source: (row as any).source,
  };
}

/**
 * Worklist V2 canonical feed:
 * - status=OPEN
 * - scope=actionable
 * - constrained wrapper over fetchTickets
 * - mapped via buildCanonicalTicketFromRow
 */
export async function fetchWorklistCanonicalTickets(params?: {
  symbol?: string;
  strategy?: string;
  limit?: number;
}): Promise<CanonicalTicket[]> {
  const { symbol, strategy, limit = 50 } = params ?? {};

  const { rows } = await fetchTickets({
    symbol,
    strategy,
    status: 'OPEN',
    scope: 'actionable',
    direction: 'ALL',
    limit,
    offset: 0,
  });

  const canonical: CanonicalTicket[] = [];
  for (const row of rows ?? []) {
    const ticket = buildCanonicalTicketFromRow(row);
    if (ticket) canonical.push(ticket);
  }
  return canonical;
}

/**
 * Analytics canonical feed:
 * - pulls historical tickets via /api/tickets
 * - uses the same canonical mapping as Worklist/Tickets
 */
export async function fetchAnalyticsCanonicalTickets(params: {
  from: string;
  to: string;
  symbol?: string;
  strategy?: string;
  limit?: number;
}): Promise<CanonicalTicket[]> {
  const { from, to, symbol, strategy, limit = 400 } = params;

  const { rows } = await fetchTickets({
    from,
    to,
    symbol,
    strategy,
    status: 'ALL',
    scope: 'all',
    direction: 'ALL',
    limit,
    offset: 0,
  });

  const canonical: CanonicalTicket[] = [];
  for (const row of rows ?? []) {
    const ticket = buildCanonicalTicketFromRow(row);
    if (ticket) canonical.push(ticket);
  }
  return canonical;
}

/**
 * Session metrics helpers – used by Worklist V2 & Analytics.
 */

export function makeSessionMetricsKey(
  symbol?: string | null,
  sessionDate?: string | null,
): string {
  return `${symbol ?? ''}__${sessionDate ?? ''}`;
}

export async function fetchSessionMetrics(args: {
  symbol: string;
  sessionDate: string;
}): Promise<SessionMetricsDto> {
  const params = new URLSearchParams();
  params.set('symbol', args.symbol);
  params.set('sessionDate', args.sessionDate);

  const url = `/api/session-metrics?${params.toString()}`;
  return (await fetchJson(url)) as SessionMetricsDto;
}

/**
 * Simple client-side batch over /api/session-metrics.
 * The backend has its own batch helpers; this stays deliberately dumb
 * and resilient on the UI side.
 */
export async function fetchSessionMetricsBatch(
  requests: Array<{ symbol?: string | null; sessionDate?: string | null }>,
): Promise<Record<string, SessionMetricsDto | null>> {
  const entries = requests
    .map((r) => {
      const symbol = (r.symbol ?? '').trim();
      const sessionDate = (r.sessionDate ?? '').trim();
      if (!symbol || !sessionDate) return null;
      return {
        key: makeSessionMetricsKey(symbol, sessionDate),
        symbol,
        sessionDate,
      };
    })
    .filter(
      (x): x is { key: string; symbol: string; sessionDate: string } => x !== null,
    );

  const result: Record<string, SessionMetricsDto | null> = {};

  await Promise.all(
    entries.map(async ({ key, symbol, sessionDate }) => {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        return;
      }
      try {
        const metrics = await fetchSessionMetrics({ symbol, sessionDate });
        result[key] = metrics;
      } catch {
        result[key] = null;
      }
    }),
  );

  return result;
}

