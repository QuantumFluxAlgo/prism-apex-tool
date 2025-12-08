/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.

import React from 'react';
import type { CanonicalTicket } from '@prism-apex/shared';

import FiltersBar from '../ui/FiltersBar';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import Badge from '../ui/Badge';

import '../styles/analytics-a3.css';

import { fmtPrice, fmtR } from '../utils/number';
import { fmtUtc } from '../utils/time';

import {
  fetchAnalyticsCanonicalTickets,
  fetchSessionMetricsBatch,
  makeSessionMetricsKey,
} from '../lib/api';
import type { SessionMetricsDto } from '../lib/api';
import { getWorklistV2CanonicalTickets } from '../lib/worklistMock';

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const pointsFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

type AnalyticsRangePreset = '7D' | '30D' | '90D' | 'YTD';

type AnalyticsFiltersState = {
  symbol: string;
  strategy: string;
  side: string;
  status: string;
  minRMultiple: string;
  search: string;
};

type AnalyticsSummary = {
  totalTickets: number;
  totalRisk: number;
  realizedPnl: number;
  avgPlannedR: number | null;
  avgRealizedR: number | null;
  expectancyR: number | null;
  winRatePct: number | null;
  bestR: number | null;
  worstR: number | null;
  avgDurationMinutes: number | null;
};

const RANGE_OPTIONS: AnalyticsRangePreset[] = ['7D', '30D', '90D', 'YTD'];
const SIDE_OPTIONS = ['ALL', 'BUY', 'SELL'] as const;
const STATUS_OPTIONS = ['ALL', 'OPEN', 'COMPLETED', 'CANCELLED'] as const;
const MIN_R_OPTIONS = ['ANY', '0', '1', '2'];

function computeRangePreset(preset: AnalyticsRangePreset): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now.getTime());
  const endIso = end.toISOString();

  if (preset === 'YTD') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0));
    return { from: start.toISOString(), to: endIso };
  }

  const days =
    preset === '7D'
      ? 7
      : preset === '30D'
      ? 30
      : preset === '90D'
      ? 90
      : 30;

  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: endIso };
}

/* ---------- helpers ---------- */

function formatPoints(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${pointsFormatter.format(value)}pt`;
}

function formatNullablePrice(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return fmtPrice(value);
}

function formatSessionMetricsSummary(metrics: SessionMetricsDto | null): string | null {
  if (!metrics) return null;
  const parts: string[] = [];

  if (typeof metrics.orWidthPoints === 'number') {
    parts.push(`OR ${formatPoints(metrics.orWidthPoints)}`);
  }
  if (typeof metrics.sessionAtrPoints === 'number') {
    parts.push(`ATR ${formatPoints(metrics.sessionAtrPoints)}`);
  }
  if (metrics.vwapSlope) parts.push(`VWAP ${metrics.vwapSlope}`);
  if (metrics.htfTrendBias) parts.push(`Trend ${metrics.htfTrendBias}`);
  if (metrics.hasMajorNewsToday) parts.push('News risk');

  if (!parts.length) return null;
  return parts.join(' · ');
}

function getSessionMetricsForTicket(
  ticket: CanonicalTicket,
  map: Record<string, SessionMetricsDto | null>,
): SessionMetricsDto | null {
  if (!ticket.symbol || !ticket.sessionDateUtc) return null;
  const key = makeSessionMetricsKey(ticket.symbol, ticket.sessionDateUtc);
  return map[key] ?? null;
}

function computeTradeDurationMinutes(ticket: CanonicalTicket): number | null {
  const created = ticket.createdAtUtc ? Date.parse(ticket.createdAtUtc) : NaN;
  const completed = ticket.completedAtUtc ? Date.parse(ticket.completedAtUtc) : NaN;
  const end = Number.isNaN(completed) ? Date.now() : completed;
  if (Number.isNaN(created)) return null;
  const minutes = (end - created) / 60000;
  if (!Number.isFinite(minutes)) return null;
  return Math.max(0, Math.round(minutes));
}

function formatStrategyName(strategyId?: string | null): string {
  const base = (strategyId ?? '').trim();
  if (!base) return 'Unknown';
  return base
    .replace(/[-_]/g, ' ')
    .replace(/\b(\w)/g, (match) => match.toUpperCase())
    .trim();
}

function classifyTicketResultR(pnlRMultiple: number | null | undefined): 'win' | 'loss' | 'flat' | 'na' {
  if (typeof pnlRMultiple !== 'number' || Number.isNaN(pnlRMultiple)) return 'na';
  if (pnlRMultiple > 0.1) return 'win';
  if (pnlRMultiple < -0.1) return 'loss';
  return 'flat';
}

function buildAnalyticsSummary(tickets: CanonicalTicket[]): AnalyticsSummary {
  if (!tickets.length) {
    return {
      totalTickets: 0,
      totalRisk: 0,
      realizedPnl: 0,
      avgPlannedR: null,
      avgRealizedR: null,
      expectancyR: null,
      winRatePct: null,
      bestR: null,
      worstR: null,
      avgDurationMinutes: null,
    };
  }

  let totalRisk = 0;
  let realizedPnl = 0;

  let plannedSumR = 0;
  let plannedCount = 0;

  let realizedSumR = 0;
  let realizedCount = 0;

  let wins = 0;
  let losses = 0;

  let bestR: number | null = null;
  let worstR: number | null = null;

  let durationSum = 0;
  let durationCount = 0;

  for (const ticket of tickets) {
    const risk = typeof ticket.totalRisk === 'number' ? ticket.totalRisk : 0;
    totalRisk += risk;

    if (typeof ticket.pnl === 'number') {
      realizedPnl += ticket.pnl;
    }

    if (typeof ticket.rrMultiple === 'number' && Number.isFinite(ticket.rrMultiple)) {
      plannedSumR += ticket.rrMultiple;
      plannedCount += 1;
    }

    if (typeof ticket.pnlRMultiple === 'number' && Number.isFinite(ticket.pnlRMultiple)) {
      const r = ticket.pnlRMultiple;
      realizedSumR += r;
      realizedCount += 1;

      if (bestR === null || r > bestR) bestR = r;
      if (worstR === null || r < worstR) worstR = r;

      const cls = classifyTicketResultR(r);
      if (cls === 'win') wins += 1;
      if (cls === 'loss') losses += 1;
    }

    const minutes = computeTradeDurationMinutes(ticket);
    if (minutes != null) {
      durationSum += minutes;
      durationCount += 1;
    }
  }

  const avgPlannedR =
    plannedCount > 0 ? plannedSumR / plannedCount : null;
  const avgRealizedR =
    realizedCount > 0 ? realizedSumR / realizedCount : null;

  const expectancyR =
    realizedCount > 0 ? realizedSumR / realizedCount : null;

  const winRatePct =
    realizedCount > 0 ? (wins / realizedCount) * 100 : null;

  const avgDurationMinutes =
    durationCount > 0 ? durationSum / durationCount : null;

  return {
    totalTickets: tickets.length,
    totalRisk,
    realizedPnl,
    avgPlannedR,
    avgRealizedR,
    expectancyR,
    winRatePct,
    bestR,
    worstR,
    avgDurationMinutes,
  };
}

/**
 * A3-style row cell wrapper – glassy hover / active with neon edge.
 */
function renderAnalyticsRowCell(
  ticket: CanonicalTicket,
  selectedId: string | null,
  onSelect: (id: string) => void,
  content: React.ReactNode,
) {
  const active = selectedId === ticket.id;
  return (
    <button
      type="button"
      onClick={() => onSelect(ticket.id)}
      className={`group w-full rounded-xl border px-2.5 py-2 text-left text-sm text-slate-200 transition
        border-slate-900/80 bg-slate-950/40 
        shadow-[0_0_0_1px_rgba(15,23,42,0.9),0_14px_32px_rgba(15,23,42,0.95)]
        hover:border-cyan-300/80 hover:bg-slate-900/90 hover:text-white
        hover:shadow-[0_0_0_1px_rgba(34,211,238,0.85),0_18px_40px_rgba(15,23,42,0.98),0_0_32px_rgba(34,211,238,0.45)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-0
        ${
          active
            ? 'border-cyan-400/70 bg-slate-900/95 shadow-[0_0_0_1px_rgba(34,211,238,0.95),0_20px_46px_rgba(15,23,42,1),0_0_40px_rgba(34,211,238,0.70)]'
            : ''
        }`}
    >
      {content}
    </button>
  );
}

function DetailsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="details-section rounded-xl border border-slate-700/80 bg-slate-950/60 px-3.5 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.95)] backdrop-blur">
      <h3 className="details-label text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </h3>
      <div className="mt-2 text-sm text-slate-200">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="ml-3 max-w-[60%] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[0.8rem] text-slate-100">
        {value ?? '—'}
      </span>
    </div>
  );
}

export default function AnalyticsPage() {
  const fallbackTickets = React.useMemo(() => getWorklistV2CanonicalTickets(), []);
  const [rangePreset, setRangePreset] = React.useState<AnalyticsRangePreset>('30D');

  const [filters, setFilters] = React.useState<AnalyticsFiltersState>({
    symbol: 'ALL',
    strategy: 'ALL',
    side: 'ALL',
    status: 'ALL',
    minRMultiple: 'ANY',
    search: '',
  });

  const [tickets, setTickets] = React.useState<CanonicalTicket[]>([]);
  const [usingApiTickets, setUsingApiTickets] = React.useState<boolean>(false);
  const [sessionMetricsMap, setSessionMetricsMap] =
    React.useState<Record<string, SessionMetricsDto | null>>({});
  const [loading, setLoading] = React.useState<boolean>(false);
  const [lastRefreshedUtc, setLastRefreshedUtc] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { from, to } = computeRangePreset(rangePreset);

        const symbolParam = filters.symbol !== 'ALL' ? filters.symbol : undefined;
        const strategyParam = filters.strategy !== 'ALL' ? filters.strategy : undefined;

        let canonical: CanonicalTicket[] = [];
        let fromApi = false;

        try {
          const apiTickets = await fetchAnalyticsCanonicalTickets({
            from,
            to,
            symbol: symbolParam,
            strategy: strategyParam,
            limit: 400,
          });
          if (Array.isArray(apiTickets) && apiTickets.length > 0) {
            canonical = apiTickets;
            fromApi = true;
          }
        } catch {
          // swallow; fall back to mock
        }

        if (!canonical.length) {
          canonical = fallbackTickets;
          fromApi = false;
        }

        const uniqueRequests: Array<{ symbol: string; sessionDate: string }> = [];
        const seen = new Set<string>();

        for (const ticket of canonical) {
          if (!ticket.symbol || !ticket.sessionDateUtc) continue;
          const key = makeSessionMetricsKey(ticket.symbol, ticket.sessionDateUtc);
          if (seen.has(key)) continue;
          seen.add(key);
          uniqueRequests.push({
            symbol: ticket.symbol,
            sessionDate: ticket.sessionDateUtc,
          });
        }

        let metricsByKey: Record<string, SessionMetricsDto | null> = {};
        if (uniqueRequests.length) {
          try {
            metricsByKey = await fetchSessionMetricsBatch(uniqueRequests);
          } catch {
            metricsByKey = {};
          }
        }

        if (cancelled) return;

        setTickets(canonical);
        setUsingApiTickets(fromApi);
        setSessionMetricsMap(metricsByKey);
        setLastRefreshedUtc(new Date().toISOString());

        setSelectedId((prev) => {
          if (prev && canonical.some((t) => t.id === prev)) return prev;
          return canonical.length ? canonical[0].id : null;
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePreset, filters.symbol, filters.strategy, fallbackTickets]);

  const symbolOptions = React.useMemo(
    () => ['ALL', ...Array.from(new Set(tickets.map((t) => t.symbol).filter(Boolean)))],
    [tickets],
  );

  const strategyOptions = React.useMemo(
    () => ['ALL', ...Array.from(new Set(tickets.map((t) => t.strategyId).filter(Boolean)))],
    [tickets],
  );

  const filteredTickets = React.useMemo<CanonicalTicket[]>(() => {
    const search = filters.search.trim().toLowerCase();
    const sideFilter = filters.side;
    const statusFilter = filters.status;
    const minR =
      filters.minRMultiple === 'ANY' ? null : Number(filters.minRMultiple);

    return tickets.filter((ticket) => {
      if (filters.symbol !== 'ALL' && ticket.symbol !== filters.symbol) return false;
      if (filters.strategy !== 'ALL' && ticket.strategyId !== filters.strategy) return false;

      if (sideFilter !== 'ALL') {
        const side = (ticket.side ?? '').toUpperCase();
        if (side !== sideFilter) return false;
      }

      if (statusFilter !== 'ALL') {
        const status = (ticket.status ?? '').toUpperCase();
        if (status !== statusFilter) return false;
      }

      if (minR !== null) {
        const planned = typeof ticket.rrMultiple === 'number' ? ticket.rrMultiple : 0;
        if (planned < minR) return false;
      }

      if (search) {
        const metrics = getSessionMetricsForTicket(ticket, sessionMetricsMap);
        const m: any = metrics;

        const haystack = [
          ticket.id,
          ticket.symbol,
          ticket.strategyId ?? '',
          ticket.notes ?? '',
          ticket.contextRegime ?? '',
          ticket.contextAtrBucket ?? '',
          ticket.contextOrType ?? '',
          m?.volRegime ?? '',
          m?.sessionQualityFlag ?? '',
          m?.sessionSkipReason ?? '',
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [tickets, filters, sessionMetricsMap]);

  React.useEffect(() => {
    if (filteredTickets.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && filteredTickets.some((ticket) => ticket.id === prev)) {
        return prev;
      }
      return filteredTickets[0].id;
    });
  }, [filteredTickets]);

  const selectedTicket = React.useMemo<CanonicalTicket | null>(
    () => filteredTickets.find((t) => t.id === selectedId) ?? null,
    [filteredTickets, selectedId],
  );

  const handleSelect = React.useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const summary = React.useMemo(
    () => buildAnalyticsSummary(filteredTickets),
    [filteredTickets],
  );

  const tableEmptyMessage =
    filteredTickets.length === 0
      ? tickets.length === 0
        ? 'No tickets returned for this range.'
        : 'No tickets match the current filters.'
      : undefined;

  const columns = React.useMemo<DataTableColumn<CanonicalTicket>[]>(
    () => [
      {
        key: 'ticket',
        header: 'Ticket',
        className: 'text-left',
        render: (ticket) =>
          renderAnalyticsRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[0.7rem] text-slate-400">
                  #{ticket.id}
                </span>
                {ticket.status ? (
                  <Badge tone={ticket.status === 'COMPLETED' ? 'green' : 'gray'}>
                    {ticket.status}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-50">{ticket.symbol}</span>
                <span className="text-[0.7rem] uppercase tracking-[0.18em] text-slate-400">
                  {ticket.side}
                </span>
                {ticket.strategyId ? (
                  <span className="text-[0.7rem] text-slate-400">
                    · {formatStrategyName(ticket.strategyId)}
                  </span>
                ) : null}
              </div>
              <span className="text-[0.65rem] text-slate-500">
                {ticket.createdAtUtc
                  ? `Opened · ${fmtUtc(ticket.createdAtUtc)}`
                  : 'Opened · ?'}
                {ticket.completedAtUtc
                  ? ` · Closed · ${fmtUtc(ticket.completedAtUtc)}`
                  : ''}
              </span>
            </div>,
          ),
      },
      {
        key: 'riskPnl',
        header: 'Risk / PnL',
        align: 'center',
        render: (ticket) => {
          const plannedR = ticket.rrMultiple;
          const realizedR = ticket.pnlRMultiple;
          const cls = classifyTicketResultR(realizedR);
          const pnl =
            typeof ticket.pnl === 'number' ? ticket.pnl : null;

          let tone: 'gray' | 'green' | 'red' | 'yellow' = 'gray';
          if (cls === 'win') tone = 'green';
          else if (cls === 'loss') tone = 'red';
          else if (cls === 'flat') tone = 'yellow';

          return renderAnalyticsRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col items-center gap-1 text-[0.7rem]">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-base text-slate-50">
                  {currencyFormatter.format(ticket.totalRisk ?? 0)}
                </span>
                <span className="text-slate-400">risk</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={tone}>
                  R {plannedR != null ? fmtR(plannedR) : '—'} →{' '}
                  {realizedR != null ? fmtR(realizedR) : '—'}
                </Badge>
                <span className="font-mono text-slate-300">
                  {pnl != null ? currencyFormatter.format(pnl) : '—'}
                </span>
              </div>
            </div>,
          );
        },
      },
      {
        key: 'duration',
        header: 'Duration',
        align: 'center',
        render: (ticket) => {
          const minutes = computeTradeDurationMinutes(ticket);
          return renderAnalyticsRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col items-center gap-1 text-[0.7rem]">
              <span className="font-mono text-base text-slate-50">
                {minutes != null ? `${minutes}m` : '—'}
              </span>
              <span className="text-[0.65rem] text-slate-400">
                Time in trade
              </span>
            </div>,
          );
        },
      },
      {
        key: 'session',
        header: 'Session Context',
        render: (ticket) => {
          const metrics = getSessionMetricsForTicket(ticket, sessionMetricsMap);
          const summaryText = formatSessionMetricsSummary(metrics);
          const m: any = metrics;

          return renderAnalyticsRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col gap-1 text-[0.7rem]">
              {summaryText ? (
                <p className="text-slate-300">{summaryText}</p>
              ) : (
                <p className="text-slate-500">Session metrics unavailable.</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                {m?.volRegime ? (
                  <Badge tone="gray">{m.volRegime}</Badge>
                ) : null}
                {metrics?.hasMajorNewsToday ? (
                  <Badge tone="yellow">
                    {(m?.newsLabel as string) || 'News risk'}
                  </Badge>
                ) : null}
                {m?.sessionQualityFlag ? (
                  <Badge tone={m.sessionQualityFlag === 'SKIP' ? 'red' : 'gray'}>
                    {m.sessionQualityFlag}
                  </Badge>
                ) : null}
                {m?.sessionSkipReason ? (
                  <span className="text-[0.65rem] text-slate-400">
                    {m.sessionSkipReason}
                  </span>
                ) : null}
              </div>
            </div>,
          );
        },
      },
    ],
    [handleSelect, selectedId, sessionMetricsMap],
  );

  const symbolLabel = filters.symbol !== 'ALL' ? filters.symbol : 'All symbols';
  const strategyLabel =
    filters.strategy !== 'ALL'
      ? formatStrategyName(filters.strategy)
      : 'All strategies';

  return (
    <section className="analytics-v2-root space-y-5">
      <header className="analytics-v2-header">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              Analytics
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Canonical ticket performance by R multiple, PnL, and time-in-trade. Use
              this surface to sanity-check strategy quality before scaling risk.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-[0.7rem]">
            <Badge tone="blue">
              {symbolLabel} · {strategyLabel}
            </Badge>
            <Badge tone="gray">
              {usingApiTickets ? 'Source · API' : 'Source · Mock worklist'}
            </Badge>
            <Badge tone="gray">
              {lastRefreshedUtc
                ? `Last refresh · ${fmtUtc(lastRefreshedUtc)}`
                : 'Loading…'}
            </Badge>
          </div>
        </div>
      </header>

      <div className="analytics-v2-filters">
        <FiltersBar
          selects={[
            {
              label: 'Symbol',
              value: filters.symbol,
              options: symbolOptions,
              onChange: (value) =>
                setFilters((prev) => ({
                  ...prev,
                  symbol: value,
                })),
            },
            {
              label: 'Strategy',
              value: filters.strategy,
              options: strategyOptions,
              onChange: (value) =>
                setFilters((prev) => ({
                  ...prev,
                  strategy: value,
                })),
            },
            {
              label: 'Side',
              value: filters.side,
              options: SIDE_OPTIONS,
              onChange: (value) =>
                setFilters((prev) => ({
                  ...prev,
                  side: value,
                })),
            },
            {
              label: 'Status',
              value: filters.status,
              options: STATUS_OPTIONS,
              onChange: (value) =>
                setFilters((prev) => ({
                  ...prev,
                  status: value,
                })),
            },
            {
              label: 'Min R',
              value: filters.minRMultiple,
              options: MIN_R_OPTIONS,
              onChange: (value) =>
                setFilters((prev) => ({
                  ...prev,
                  minRMultiple: value,
                })),
            },
            {
              label: 'Window',
              value: rangePreset,
              options: RANGE_OPTIONS,
              onChange: (value) =>
                setRangePreset(value as AnalyticsRangePreset),
            },
          ]}
          toggles={[]}
          extra={
            <input
              type="search"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  search: event.target.value,
                }))
              }
              placeholder="Search symbol / strategy / tags / flags"
              className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-sm text-slate-100 placeholder:text-slate-500 shadow-[0_0_0_1px_rgba(15,23,42,0.9)] focus:border-cyan-400 focus:outline-none focus:ring-0 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.85),0_0_20px_rgba(34,211,238,0.45)]"
            />
          }
        />
      </div>

      <div className="analytics-v2-layout">
        <div className="panel analytics-v2-panel min-w-0 flex-1">
          <div className="panel-header flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
                Analytics · Ticket Outcomes
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">
                {filteredTickets.length} Tickets
              </h2>
            </div>
            <div className="flex flex-col items-end gap-1 text-[0.7rem]">
              <Badge tone="gray">
                {summary.totalTickets} in sample ·{' '}
                {currencyFormatter.format(summary.totalRisk)} risk
              </Badge>
              <span className="text-[0.65rem] text-slate-500">
                Selection drives ticket details to the right.
              </span>
            </div>
          </div>
          <div className="panel-body">
            <DataTable
              className="analytics-v2-table"
              columns={columns}
              rows={filteredTickets}
              rowKey={(ticket) => ticket.id}
              loading={loading}
              emptyMessage={tableEmptyMessage}
            />
          </div>
        </div>

        <div className="panel analytics-v2-details w-full max-w-[380px] shrink-0 lg:max-w-full">
          <div className="details-header border-b border-slate-800/80 px-4 pb-3 pt-3">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Performance Details
            </h2>
            <span className="mt-1 text-[0.7rem] text-slate-500">
              {selectedTicket
                ? 'Selection shows ticket-level breakdown. Summary reflects current filters.'
                : 'Select a ticket in the table to inspect its full breakdown.'}
            </span>
          </div>
          <div className="details-body space-y-4 px-4 pb-4 pt-3">
            <DetailsSection title="Filtered Sample Summary">
              <div className="space-y-2">
                <InfoRow
                  label="Tickets"
                  value={summary.totalTickets}
                />
                <InfoRow
                  label="Total risk"
                  value={currencyFormatter.format(summary.totalRisk)}
                />
                <InfoRow
                  label="Realized PnL"
                  value={currencyFormatter.format(summary.realizedPnl)}
                />
                <InfoRow
                  label="Avg planned R"
                  value={
                    summary.avgPlannedR != null ? fmtR(summary.avgPlannedR) : '—'
                  }
                />
                <InfoRow
                  label="Avg realized R"
                  value={
                    summary.avgRealizedR != null ? fmtR(summary.avgRealizedR) : '—'
                  }
                />
                <InfoRow
                  label="Expectancy (R)"
                  value={
                    summary.expectancyR != null ? fmtR(summary.expectancyR) : '—'
                  }
                />
                <InfoRow
                  label="Win rate"
                  value={
                    summary.winRatePct != null
                      ? `${summary.winRatePct.toFixed(1)}%`
                      : '—'
                  }
                />
                <InfoRow
                  label="Best / worst R"
                  value={
                    summary.bestR != null || summary.worstR != null
                      ? `${summary.bestR != null ? fmtR(summary.bestR) : '—'} / ${
                          summary.worstR != null ? fmtR(summary.worstR) : '—'
                        }`
                      : '—'
                  }
                />
                <InfoRow
                  label="Avg duration"
                  value={
                    summary.avgDurationMinutes != null
                      ? `${summary.avgDurationMinutes.toFixed(0)}m`
                      : '—'
                  }
                />
              </div>
            </DetailsSection>

            {selectedTicket ? (
              <>
                <DetailsSection title="Ticket Summary">
                  <div className="space-y-2">
                    <InfoRow label="ID" value={selectedTicket.id} />
                    <InfoRow label="Symbol" value={selectedTicket.symbol} />
                    <InfoRow
                      label="Side"
                      value={selectedTicket.side}
                    />
                    <InfoRow
                      label="Strategy"
                      value={formatStrategyName(selectedTicket.strategyId)}
                    />
                    <InfoRow
                      label="Status"
                      value={selectedTicket.status}
                    />
                    <InfoRow
                      label="Created"
                      value={fmtUtc(selectedTicket.createdAtUtc)}
                    />
                    <InfoRow
                      label="Completed"
                      value={
                        selectedTicket.completedAtUtc
                          ? fmtUtc(selectedTicket.completedAtUtc)
                          : '—'
                      }
                    />
                    <InfoRow
                      label="Session date"
                      value={selectedTicket.sessionDateUtc}
                    />
                  </div>
                </DetailsSection>

                <DetailsSection title="Risk & PnL">
                  <div className="space-y-2">
                    <InfoRow
                      label="Contracts"
                      value={selectedTicket.quantity}
                    />
                    <InfoRow
                      label="Per-contract risk"
                      value={currencyFormatter.format(
                        selectedTicket.perContractRisk,
                      )}
                    />
                    <InfoRow
                      label="Total risk"
                      value={currencyFormatter.format(selectedTicket.totalRisk)}
                    />
                    <InfoRow
                      label="Expected reward"
                      value={currencyFormatter.format(
                        selectedTicket.expectedReward,
                      )}
                    />
                    <InfoRow
                      label="Planned R"
                      value={fmtR(selectedTicket.rrMultiple)}
                    />
                    <InfoRow
                      label="Realized R"
                      value={
                        selectedTicket.pnlRMultiple != null
                          ? fmtR(selectedTicket.pnlRMultiple)
                          : '—'
                      }
                    />
                    <InfoRow
                      label="Realized PnL"
                      value={
                        typeof selectedTicket.pnl === 'number'
                          ? currencyFormatter.format(selectedTicket.pnl)
                          : '—'
                      }
                    />
                  </div>
                </DetailsSection>

                <DetailsSection title="Session Metrics">
                  {(() => {
                    const metrics = getSessionMetricsForTicket(
                      selectedTicket,
                      sessionMetricsMap,
                    );
                    const m: any = metrics;
                    if (!metrics) {
                      return (
                        <p className="text-[0.7rem] text-slate-500">
                          Session metrics unavailable.
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        <InfoRow
                          label="OR High"
                          value={formatNullablePrice(m.orHigh)}
                        />
                        <InfoRow
                          label="OR Low"
                          value={formatNullablePrice(m.orLow)}
                        />
                        <InfoRow
                          label="OR Width"
                          value={formatPoints(metrics.orWidthPoints)}
                        />
                        <InfoRow
                          label="Session ATR"
                          value={formatPoints(metrics.sessionAtrPoints)}
                        />
                        <InfoRow
                          label="VWAP Slope"
                          value={metrics.vwapSlope ?? '—'}
                        />
                        <InfoRow
                          label="Trend Bias"
                          value={metrics.htfTrendBias ?? '—'}
                        />
                        <InfoRow
                          label="Regime"
                          value={m.volRegime ?? '—'}
                        />
                        <InfoRow
                          label="Session flag"
                          value={metrics.sessionQualityFlag ?? '—'}
                        />
                        <InfoRow
                          label="Skip reason"
                          value={metrics.sessionSkipReason ?? '—'}
                        />
                        <InfoRow
                          label="News"
                          value={
                            metrics.hasMajorNewsToday
                              ? m.newsLabel ?? 'Major event'
                              : 'None'
                          }
                        />
                      </div>
                    );
                  })()}
                </DetailsSection>

                <DetailsSection title="Notes & Context">
                  <div className="space-y-2 text-sm">
                    <InfoRow
                      label="Context regime"
                      value={selectedTicket.contextRegime ?? '—'}
                    />
                    <InfoRow
                      label="ATR bucket"
                      value={selectedTicket.contextAtrBucket ?? '—'}
                    />
                    <InfoRow
                      label="OR type"
                      value={selectedTicket.contextOrType ?? '—'}
                    />
                    <div>
                      <p className="text-xs text-slate-400">Notes</p>
                      <p className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[0.78rem] text-slate-100">
                        {selectedTicket.notes ?? 'No operator notes attached.'}
                      </p>
                    </div>
                  </div>
                </DetailsSection>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/70 p-6 text-center text-sm text-slate-400 shadow-[0_16px_40px_rgba(15,23,42,0.95)]">
                Select a ticket from the Analytics table to see its full risk,
                PnL, and session context breakdown.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

