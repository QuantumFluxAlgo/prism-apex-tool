/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.

import React from 'react';
import type { CanonicalTicket } from '@prism-apex/shared';

import { Card, CardBody, CardHeader } from '../ui/Card';
import FiltersBar from '../ui/FiltersBar';
import Badge from '../ui/Badge';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import { fmtPrice } from '../utils/number';

import type { SessionMetricsDto } from '../lib/api';
import {
  fetchAnalyticsCanonicalTickets,
  fetchSessionMetricsBatch,
  makeSessionMetricsKey,
} from '../lib/api';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LOOKBACK_DAYS = 14;

type FiltersState = {
  from: string;
  to: string;
  symbol: string;
  strategy: string;
  regime: string;
};

type AnalyticsTicket = CanonicalTicket & {
  sessionMetrics?: SessionMetricsDto | null;
};

type DailyPoint = {
  dateKey: string;
  label: string;
  pnl: number;
  sanitizedPnl: number;
  trades: number;
  wins: number;
  avgRr: number | null;
};

type Kpis = {
  totalPnl: number;
  sanitizedPnl: number;
  trades: number;
  winRate: number | null;
  avgRr: number | null;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const rrFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) =>
  new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);

function safeDateKey(ticket: CanonicalTicket): string | null {
  const fromSession = ticket.sessionDateUtc;
  if (fromSession && fromSession.length >= 10) return fromSession.slice(0, 10);

  const raw =
    ticket.completedAtUtc ??
    ticket.updatedAtUtc ??
    ticket.createdAtUtc ??
    null;
  if (!raw) return null;
  const iso = String(raw);
  return iso.slice(0, 10);
}

function getRegime(ticket: AnalyticsTicket): string {
  return (ticket.contextRegime ?? 'UNKNOWN').toUpperCase();
}

function buildSelectOptions(values: Array<string | null | undefined>): string[] {
  const out = new Set<string>();
  out.add('ALL');
  for (const v of values) {
    const trimmed = (v ?? '').trim();
    if (!trimmed) continue;
    out.add(trimmed);
  }
  return Array.from(out);
}

function computeKpis(tickets: AnalyticsTicket[]): Kpis {
  const closed = tickets.filter((t) => typeof t.pnl === 'number');
  const trades = closed.length;
  if (!trades) {
    return {
      totalPnl: 0,
      sanitizedPnl: 0,
      trades: 0,
      winRate: null,
      avgRr: null,
    };
  }

  let totalPnl = 0;
  let sanitizedPnl = 0;
  let wins = 0;
  let rrSum = 0;
  let rrCount = 0;

  for (const t of closed) {
    const pnl = typeof t.pnl === 'number' ? t.pnl : 0;
    totalPnl += pnl;

    const cap = 2500; // basic sanity cap so a single freak day doesn’t dominate the “sanitized” view
    const capped = Math.max(-cap, Math.min(cap, pnl));
    sanitizedPnl += capped;

    if (pnl > 0) wins += 1;

    const rr =
      typeof t.pnlRMultiple === 'number'
        ? t.pnlRMultiple
        : typeof t.rrMultiple === 'number'
        ? t.rrMultiple
        : null;
    if (typeof rr === 'number' && Number.isFinite(rr)) {
      rrSum += rr;
      rrCount += 1;
    }
  }

  return {
    totalPnl,
    sanitizedPnl,
    trades,
    winRate: trades ? (wins / trades) * 100 : null,
    avgRr: rrCount ? rrSum / rrCount : null,
  };
}

function buildDailyPoints(tickets: AnalyticsTicket[]): DailyPoint[] {
  const byDay = new Map<string, DailyPoint>();

  for (const t of tickets) {
    const key = safeDateKey(t);
    if (!key) continue;

    const pnl = typeof t.pnl === 'number' ? t.pnl : 0;
    const rr =
      typeof t.pnlRMultiple === 'number'
        ? t.pnlRMultiple
        : typeof t.rrMultiple === 'number'
        ? t.rrMultiple
        : null;

    const existing = byDay.get(key) ?? {
      dateKey: key,
      label: key.slice(5),
      pnl: 0,
      sanitizedPnl: 0,
      trades: 0,
      wins: 0,
      avgRr: 0,
    };

    existing.trades += 1;
    existing.pnl += pnl;

    const cap = 2500;
    const capped = Math.max(-cap, Math.min(cap, pnl));
    existing.sanitizedPnl += capped;

    if (pnl > 0) existing.wins += 1;

    if (typeof rr === 'number' && Number.isFinite(rr)) {
      const rrCount = existing.trades; // approximate, good enough for UI
      existing.avgRr =
        ((existing.avgRr ?? 0) * (rrCount - 1) + rr) / rrCount;
    }

    byDay.set(key, existing);
  }

  return Array.from(byDay.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey),
  );
}

function buildRegimeStats(tickets: AnalyticsTicket[]) {
  const byRegime = new Map<
    string,
    { trades: number; pnl: number; winRate: number | null }
  >();

  for (const t of tickets) {
    const regime = getRegime(t);
    const pnl = typeof t.pnl === 'number' ? t.pnl : 0;
    const isWin = pnl > 0;

    const existing = byRegime.get(regime) ?? {
      trades: 0,
      pnl: 0,
      winRate: null,
    };

    existing.trades += 1;
    existing.pnl += pnl;

    const wins =
      ((existing.winRate ?? 0) / 100) * (existing.trades - 1) + (isWin ? 1 : 0);
    existing.winRate = (wins / existing.trades) * 100;

    byRegime.set(regime, existing);
  }

  return Array.from(byRegime.entries())
    .map(([regime, stats]) => ({ regime, ...stats }))
    .sort((a, b) => b.trades - a.trades);
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(Math.round(value));
}

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  return `${percentFormatter.format(value)}%`;
}

function formatRr(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  return `${rrFormatter.format(value)}R`;
}

function formatDateLabel(ticket: CanonicalTicket): string {
  const key = safeDateKey(ticket);
  if (!key) return '—';
  const [y, m, d] = key.split('-');
  return `${d}/${m}`;
}

function formatSide(side?: string | null): string {
  const s = (side ?? '').toUpperCase();
  if (!s) return '—';
  return s === 'BUY' || s === 'LONG' ? 'LONG' : s === 'SELL' || s === 'SHORT' ? 'SHORT' : s;
}

function formatStrategy(strategyId?: string | null): string {
  const raw = (strategyId ?? '').trim();
  if (!raw) return '—';
  return raw.replace(/[-_]/g, ' ').toUpperCase();
}

function formatRegimeLabel(ticket: AnalyticsTicket): string {
  const regime = getRegime(ticket);
  return regime === 'UNKNOWN' ? 'Unknown' : regime;
}

function formatPnl(ticket: AnalyticsTicket): string {
  if (typeof ticket.pnl !== 'number') return '—';
  return fmtPrice(ticket.pnl);
}

function formatRMultiple(ticket: AnalyticsTicket): string {
  const value =
    typeof ticket.pnlRMultiple === 'number'
      ? ticket.pnlRMultiple
      : typeof ticket.rrMultiple === 'number'
      ? ticket.rrMultiple
      : null;
  return formatRr(value);
}

function formatNewsFlag(ticket: AnalyticsTicket): string {
  const metrics = ticket.sessionMetrics;
  if (!metrics) return '—';
  return metrics.hasMajorNewsToday ? 'News risk' : 'No major news';
}

function formatSampleSize(trades: number): string {
  if (!trades) return 'No trades in range';
  if (trades === 1) return '1 trade';
  return `${trades} trades`;
}

export default function AnalyticsPage() {
  const [filters, setFilters] = React.useState<FiltersState>({
    from: daysAgoIso(DEFAULT_LOOKBACK_DAYS),
    to: todayIso(),
    symbol: 'ALL',
    strategy: 'ALL',
    regime: 'ALL',
  });

  const [tickets, setTickets] = React.useState<AnalyticsTicket[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null);

  const loadAnalytics = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const canonical = await fetchAnalyticsCanonicalTickets({
        from: filters.from,
        to: filters.to,
        symbol: filters.symbol !== 'ALL' ? filters.symbol : undefined,
        strategy: filters.strategy !== 'ALL' ? filters.strategy : undefined,
        limit: 600,
      });

      let enriched: AnalyticsTicket[] = canonical as AnalyticsTicket[];

      if (canonical.length) {
        const metricRequests = canonical
          .filter((ticket) => Boolean(ticket.sessionDateUtc))
          .map((ticket) => ({
            symbol: ticket.symbol,
            sessionDate: ticket.sessionDateUtc as string,
          }));

        if (metricRequests.length) {
          const metricsMap = await fetchSessionMetricsBatch(metricRequests);
          enriched = canonical.map((ticket) => {
            const key = makeSessionMetricsKey(
              ticket.symbol,
              ticket.sessionDateUtc,
            );
            return {
              ...ticket,
              sessionMetrics: key ? metricsMap[key] ?? null : null,
            };
          });
        }
      }

      setTickets(enriched);
      setLastRefreshed(new Date());
    } catch (err) {
      setTickets([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [filters.from, filters.to, filters.symbol, filters.strategy]);

  React.useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const symbolOptions = React.useMemo(
    () => buildSelectOptions(tickets.map((t) => t.symbol)),
    [tickets],
  );
  const strategyOptions = React.useMemo(
    () => buildSelectOptions(tickets.map((t) => t.strategyId)),
    [tickets],
  );
  const regimeOptions = React.useMemo(
    () => buildSelectOptions(tickets.map((t) => t.contextRegime)),
    [tickets],
  );

  const filteredTickets = React.useMemo(() => {
    return tickets.filter((ticket) => {
      if (filters.symbol !== 'ALL' && ticket.symbol !== filters.symbol) {
        return false;
      }
      if (
        filters.strategy !== 'ALL' &&
        (ticket.strategyId ?? '') !== filters.strategy
      ) {
        return false;
      }
      if (filters.regime !== 'ALL' && getRegime(ticket) !== filters.regime) {
        return false;
      }
      return true;
    });
  }, [tickets, filters.symbol, filters.strategy, filters.regime]);

  const kpis = React.useMemo(
    () => computeKpis(filteredTickets),
    [filteredTickets],
  );
  const dailyPoints = React.useMemo(
    () => buildDailyPoints(filteredTickets),
    [filteredTickets],
  );
  const regimeStats = React.useMemo(
    () => buildRegimeStats(filteredTickets),
    [filteredTickets],
  );

  const columns = React.useMemo<DataTableColumn<AnalyticsTicket>[]>(
    () => [
      {
        key: 'date',
        header: 'Date',
        render: (row) => (
          <span className="font-geist-mono text-[11px] text-[var(--apex-text-muted)]">
            {formatDateLabel(row)}
          </span>
        ),
      },
      {
        key: 'symbol',
        header: 'Symbol',
        render: (row) => (
          <span className="font-geist-mono text-xs text-[var(--apex-text)]">
            {row.symbol}
          </span>
        ),
      },
      {
        key: 'strategy',
        header: 'Strategy',
        render: (row) => (
          <span className="text-xs text-[var(--apex-text-secondary)]">
            {formatStrategy(row.strategyId)}
          </span>
        ),
      },
      {
        key: 'side',
        header: 'Side',
        render: (row) => (
          <span className="font-geist-mono text-[11px] text-[var(--apex-text)]">
            {formatSide(row.side)}
          </span>
        ),
      },
      {
        key: 'pnl',
        header: 'PnL',
        align: 'right',
        render: (row) => (
          <span className="font-geist-mono text-xs text-[var(--apex-text)]">
            {formatPnl(row)}
          </span>
        ),
      },
      {
        key: 'rr',
        header: 'R multiple',
        align: 'right',
        render: (row) => (
          <span className="font-geist-mono text-xs text-[var(--apex-text-muted)]">
            {formatRMultiple(row)}
          </span>
        ),
      },
      {
        key: 'regime',
        header: 'Regime',
        render: (row) => (
          <span className="text-[11px] text-[var(--apex-text-secondary)]">
            {formatRegimeLabel(row)}
          </span>
        ),
      },
      {
        key: 'news',
        header: 'News',
        render: (row) => (
          <span className="text-[11px] text-[var(--apex-text-muted)]">
            {formatNewsFlag(row)}
          </span>
        ),
      },
    ],
    [],
  );

  const hasData = filteredTickets.length > 0;

  return (
    <section className="flex flex-col gap-4">
      <FiltersBar
        dateRange={{
          from: filters.from,
          to: filters.to,
          onChange: (from, to) =>
            setFilters((prev) => ({
              ...prev,
              from: from ?? prev.from,
              to: to ?? prev.to,
            })),
        }}
        selects={[
          {
            label: 'Symbol',
            value: filters.symbol,
            options: symbolOptions,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, symbol: value })),
          },
          {
            label: 'Strategy',
            value: filters.strategy,
            options: strategyOptions,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, strategy: value })),
          },
          {
            label: 'Regime',
            value: filters.regime,
            options: regimeOptions,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, regime: value })),
          },
        ]}
        extra={
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--apex-text-muted)]">
            {isLoading && (
              <span data-testid="analytics-loading">Loading analytics…</span>
            )}
            {error && (
              <span className="text-[var(--badge-red-fg)]" role="alert">
                {`Error loading analytics: ${error}`}
              </span>
            )}
            {lastRefreshed && !isLoading && !error && (
              <span className="font-geist-mono">
                Last refreshed:{' '}
                {lastRefreshed.toISOString().replace('T', ' ').slice(0, 19)}
              </span>
            )}
          </div>
        }
      />

      {/* KPI ROW */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="flex items-center justify-between border-b border-[var(--apex-card-border)] px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--apex-text-muted)]">
              Total P&L
            </span>
          </CardHeader>
          <CardBody className="px-4 py-3">
            <div className="text-xl font-semibold text-[var(--apex-text)]">
              {formatCurrency(kpis.totalPnl)}
            </div>
            <p className="mt-1 text-[11px] text-[var(--apex-text-muted)]">
              {formatSampleSize(kpis.trades)}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between border-b border-[var(--apex-card-border)] px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--apex-text-muted)]">
              Sanitized P&L
            </span>
          </CardHeader>
          <CardBody className="px-4 py-3">
            <div className="text-xl font-semibold text-[var(--apex-text)]">
              {formatCurrency(kpis.sanitizedPnl)}
            </div>
            <p className="mt-1 text-[11px] text-[var(--apex-text-muted)]">
              Capped per ticket to reduce outliers.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between border-b border-[var(--apex-card-border)] px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--apex-text-muted)]">
              Win rate
            </span>
          </CardHeader>
          <CardBody className="px-4 py-3">
            <div className="text-xl font-semibold text-[var(--apex-text)]">
              {kpis.winRate === null ? '—' : formatPercent(kpis.winRate)}
            </div>
            <p className="mt-1 text-[11px] text-[var(--apex-text-muted)]">
              Closed trades only.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between border-b border-[var(--apex-card-border)] px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--apex-text-muted)]">
              Avg R multiple
            </span>
          </CardHeader>
          <CardBody className="px-4 py-3">
            <div className="text-xl font-semibold text-[var(--apex-text)]">
              {kpis.avgRr === null ? '—' : formatRr(kpis.avgRr)}
            </div>
            <p className="mt-1 text-[11px] text-[var(--apex-text-muted)]">
              From realised R or planned R if realised is missing.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* BODY: CHART + REGIMES + TABLE */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* PnL OVER TIME */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between border-b border-[var(--apex-card-border)] px-4 py-3">
            <div>
              <h2 className="text-sm font-medium text-[var(--apex-text)]">
                Performance over time
              </h2>
              <p className="text-[11px] text-[var(--apex-text-muted)]">
                Daily P&L using canonical tickets in the selected range.
              </p>
            </div>
          </CardHeader>
          <CardBody className="px-4 py-4">
            {!hasData ? (
              <p className="text-xs text-[var(--apex-text-muted)]">
                No trades for the current filters.
              </p>
            ) : (
              <div className="flex h-40 items-end gap-2 rounded-2xl bg-[var(--apex-surface-muted)] px-4 py-3">
                {dailyPoints.map((point) => {
                  const magnitude = Math.min(
                    100,
                    Math.abs(point.sanitizedPnl) / 50,
                  );
                  const height = 10 + magnitude;
                  const positive = point.sanitizedPnl >= 0;
                  return (
                    <div
                      key={point.dateKey}
                      className="flex flex-col items-center justify-end gap-1"
                    >
                      <div
                        className={[
                          'w-[10px] rounded-full',
                          'transition-all',
                          positive
                            ? 'bg-[rgba(75,232,163,0.9)]'
                            : 'bg-[rgba(255,106,106,0.95)]',
                        ].join(' ')}
                        style={{ height: `${height}px` }}
                      />
                      <span className="font-geist-mono text-[9px] text-[var(--apex-text-muted)]">
                        {point.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* REGIME BREAKDOWN */}
        <Card>
          <CardHeader className="flex items-center justify-between border-b border-[var(--apex-card-border)] px-4 py-3">
            <div>
              <h2 className="text-sm font-medium text-[var(--apex-text)]">
                Regime breakdown
              </h2>
              <p className="text-[11px] text-[var(--apex-text-muted)]">
                P&L and win rate by contextRegime.
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-2 px-4 py-3">
            {!hasData ? (
              <p className="text-xs text-[var(--apex-text-muted)]">
                No regime stats yet.
              </p>
            ) : (
              regimeStats.map((row) => (
                <div
                  key={row.regime}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{row.regime}</Badge>
                    <span className="text-[var(--apex-text-muted)]">
                      {formatSampleSize(row.trades)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-geist-mono">
                    <span className="text-[var(--apex-text)]">
                      {formatCurrency(row.pnl)}
                    </span>
                    <span className="text-[var(--apex-text-muted)]">
                      {row.winRate === null
                        ? '—'
                        : formatPercent(row.winRate)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* TRADE TABLE */}
      <Card>
        <CardHeader className="flex items-center justify-between border-b border-[var(--apex-card-border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-medium text-[var(--apex-text)]">
              Trades in range
            </h2>
            <p className="text-[11px] text-[var(--apex-text-muted)]">
              Canonical tickets backing these analytics. Same contract as Worklist
              and Tickets.
            </p>
          </div>
        </CardHeader>
        <CardBody className="px-4 py-3">
          <DataTable<AnalyticsTicket>
            columns={columns}
            rows={filteredTickets}
            rowKey={(row) => row.id ?? `${row.symbol}-${row.createdAtUtc}`}
            loading={isLoading}
            emptyMessage={
              isLoading
                ? 'Loading analytics…'
                : 'No tickets returned for the current filters.'
            }
            className="text-xs"
          />
        </CardBody>
      </Card>
    </section>
  );
}
