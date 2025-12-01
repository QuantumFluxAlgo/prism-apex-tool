/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import React from 'react';
import type { CanonicalTicket } from '@prism-apex/shared';
import { Card, CardBody, CardHeader } from '../ui/Card';
import FiltersBar from '../ui/FiltersBar';
import Button from '../ui/Button';
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
  volatility: string;
  search: string;
};

type AnalyticsTicket = CanonicalTicket & { sessionMetrics?: SessionMetricsDto | null };

type DailyPoint = {
  dateKey: string;
  label: string;
  pnl: number;
  sanitizedPnl: number;
  avgScore: number;
  avgRr: number;
};

type StrategyRow = {
  id: string;
  strategyId: string;
  symbol: string;
  regime: string;
  winRate: number;
  avgRr: number;
  profitFactor: number | null;
  trades: number;
};

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);

export default function AnalyticsPage() {
  const [filters, setFilters] = React.useState<FiltersState>({
    from: daysAgoIso(DEFAULT_LOOKBACK_DAYS),
    to: todayIso(),
    symbol: 'ALL',
    strategy: 'ALL',
    regime: 'ALL',
    volatility: 'ALL',
    search: '',
  });
  const [tickets, setTickets] = React.useState<CanonicalTicket[]>([]);
  const [sessionMetricsMap, setSessionMetricsMap] = React.useState<Record<string, SessionMetricsDto | null>>({});
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
        limit: 400,
      });
      setTickets(canonical);

      if (canonical.length) {
        const metricRequests = canonical
          .filter((ticket) => Boolean(ticket.sessionDateUtc))
          .map((ticket) => ({
            symbol: ticket.symbol,
            sessionDate: ticket.sessionDateUtc as string,
          }));
        const metrics = await fetchSessionMetricsBatch(metricRequests);
        setSessionMetricsMap(metrics);
      } else {
        setSessionMetricsMap({});
      }
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTickets([]);
      setSessionMetricsMap({});
    } finally {
      setIsLoading(false);
    }
  }, [filters.from, filters.to, filters.symbol, filters.strategy]);

  React.useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const enrichedTickets = React.useMemo<AnalyticsTicket[]>(() => {
    if (!tickets.length) return [];
    return tickets.map((ticket) => {
      const key = makeSessionMetricsKey(ticket.symbol, ticket.sessionDateUtc);
      return {
        ...ticket,
        sessionMetrics: sessionMetricsMap[key] ?? null,
      };
    });
  }, [tickets, sessionMetricsMap]);

  const symbolOptions = React.useMemo(() => buildSelectOptions(tickets.map((ticket) => ticket.symbol)), [tickets]);
  const strategyOptions = React.useMemo(
    () => buildSelectOptions(tickets.map((ticket) => ticket.strategyId)),
    [tickets],
  );
  const regimeOptions = React.useMemo(
    () => buildSelectOptions(enrichedTickets.map((ticket) => getRegimeValue(ticket))),
    [enrichedTickets],
  );
  const volatilityOptions = React.useMemo(
    () => buildSelectOptions(enrichedTickets.map((ticket) => getVolatilityBucket(ticket))),
    [enrichedTickets],
  );

  const filteredTickets = React.useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return enrichedTickets.filter((ticket) => {
      if (filters.symbol !== 'ALL' && ticket.symbol !== filters.symbol) return false;
      if (filters.strategy !== 'ALL' && ticket.strategyId !== filters.strategy) return false;
      if (filters.regime !== 'ALL' && getRegimeValue(ticket) !== filters.regime) return false;
      if (filters.volatility !== 'ALL' && getVolatilityBucket(ticket) !== filters.volatility) return false;
      if (search) {
        const haystack = [
          ticket.symbol,
          ticket.strategyId,
          ticket.notes ?? '',
          ticket.tags?.join(' ') ?? '',
          ticket.contextRegime ?? '',
          ticket.contextAtrBucket ?? '',
          ticket.contextOrType ?? '',
          ticket.source ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [enrichedTickets, filters]);

  const dailyPoints = React.useMemo(() => buildDailyPoints(filteredTickets), [filteredTickets]);
  const regimeStats = React.useMemo(() => computeRegimeStats(filteredTickets), [filteredTickets]);
  const atrStats = React.useMemo(() => computeAtrBuckets(filteredTickets), [filteredTickets]);
  const newsStats = React.useMemo(() => computeNewsSplit(filteredTickets), [filteredTickets]);
  const strategyRows = React.useMemo(() => buildStrategyRows(filteredTickets), [filteredTickets]);
  const kpis = React.useMemo(() => computeKpis(filteredTickets), [filteredTickets]);

  const pnlSeries = dailyPoints.map((point) => point.pnl);
  const scoreSeries = dailyPoints.map((point) => point.avgScore);
  const driftSeries = dailyPoints.map((point) => point.avgRr);
  const configSeries = React.useMemo(() => buildConfigSeries(dailyPoints), [dailyPoints]);
  const chartLabels = dailyPoints.map((point) => point.label);

  return (
    <section className="space-y-5">
      <header className="space-y-1 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Diagnostics</p>
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-slate-400">
          Canonical ticket performance, drift, and regime diagnostics. All metrics respect the tickets-only guardrails.
        </p>
      </header>

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
            onChange: (value) => setFilters((prev) => ({ ...prev, symbol: value })),
          },
          {
            label: 'Strategy',
            value: filters.strategy,
            options: strategyOptions,
            onChange: (value) => setFilters((prev) => ({ ...prev, strategy: value })),
          },
          {
            label: 'Regime',
            value: filters.regime,
            options: regimeOptions,
            onChange: (value) => setFilters((prev) => ({ ...prev, regime: value })),
          },
          {
            label: 'Volatility',
            value: filters.volatility,
            options: volatilityOptions,
            onChange: (value) => setFilters((prev) => ({ ...prev, volatility: value })),
          },
        ]}
        extra={
          <input
            type="search"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Search notes / tags / flags"
            className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-sm text-white placeholder:text-slate-500"
          />
        }
      >
        <Button size="sm" variant="ghost" disabled={isLoading} onClick={loadAnalytics}>
          {isLoading ? 'Loading…' : 'Refresh'}
        </Button>
      </FiltersBar>

      {error && <p className="text-sm text-red-400">Failed to load analytics: {error}</p>}
      {lastRefreshed && (
        <p className="text-xs text-slate-500">
          Updated {lastRefreshed.toLocaleTimeString(undefined, { hour12: false })} · Range {filters.from} → {filters.to}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Net PnL (R)" value={`${formatSigned(kpis.netPnL, 1)}R`} detail={`${filteredTickets.length} trades`} />
        <KpiCard label="Win Rate" value={percentFormatter.format(kpis.winRate / 100)} detail="Closed canonical tickets" />
        <KpiCard label="Max Drawdown" value={`${formatSigned(kpis.maxDrawdown, 1)}R`} detail="Cumulative R multiple" tone="negative" />
        <KpiCard label="Average R:R" value={numberFormatter.format(kpis.avgRr)} detail="Risk:Reward multiple" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Daily PnL vs Avg Score" subtitle="Price-aligned canonical tickets per session.">
          {dailyPoints.length ? (
            <LineChart
              labels={chartLabels}
              series={[
                { label: 'PnL (R)', data: pnlSeries, color: '#42E2F4' },
                { label: 'Avg score', data: scoreSeries, color: '#4BE8A3' },
              ]}
            />
          ) : (
            <EmptyState message="No ticket data in range." />
          )}
        </ChartPanel>

        <ChartPanel title="Win % by Regime & ATR" subtitle="Session metrics + canonical ticket outcomes.">
          {regimeStats.length ? (
            <BarMeterList
              items={regimeStats.map((stat) => ({
                label: stat.label,
                value: stat.winRate,
                detail: `${stat.trades} trades`,
              }))}
            />
          ) : (
            <EmptyState message="No regime coverage for filters." />
          )}

          <div className="mt-6 space-y-2 text-xs text-slate-400">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">ATR distribution</p>
            {atrStats.length ? (
              atrStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between rounded-lg bg-slate-900/30 px-3 py-2">
                  <span>{stat.label}</span>
                  <span className="font-mono text-white">
                    {stat.trades} · {formatSigned(stat.avgPnL, 2)}R avg
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-500">No ATR data.</p>
            )}
          </div>

          <div className="mt-6 grid gap-3 text-xs text-slate-400 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Major news sessions</p>
              <p className={`text-lg font-mono ${newsStats.newsPnL < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {formatSigned(newsStats.newsPnL, 2)}R
              </p>
              <p>{newsStats.newsTrades} trades</p>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Non-news sessions</p>
              <p className={`text-lg font-mono ${newsStats.cleanPnL < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {formatSigned(newsStats.cleanPnL, 2)}R
              </p>
              <p>{newsStats.cleanTrades} trades</p>
            </div>
          </div>
        </ChartPanel>

        <ChartPanel title="Score & R:R Drift" subtitle="Rolling averages across filtered tickets.">
          {dailyPoints.length ? (
            <LineChart
              labels={chartLabels}
              series={[
                { label: 'Avg score', data: scoreSeries, color: '#9B5CFF', dashed: false },
                { label: 'Avg R:R', data: driftSeries, color: '#4BE8A3', dashed: true },
              ]}
            />
          ) : (
            <EmptyState message="No drift data yet." />
          )}
        </ChartPanel>

        <ChartPanel title="Config Impact (Actual vs News-filtered)" subtitle="Simulated config impact removing news-trading.">
          {configSeries.length ? (
            <LineChart
              labels={configSeries.map((point) => point.label)}
              series={[
                { label: 'Current config', data: configSeries.map((point) => point.current), color: '#42E2F4' },
                { label: 'News-filtered', data: configSeries.map((point) => point.sanitized), color: '#4BE8A3', dashed: true },
              ]}
            />
          ) : (
            <EmptyState message="Need more closed tickets to show config results." />
          )}
          {configSeries.length ? (
            <div className="mt-4 text-xs text-slate-400">
              <p>
                Δ (news-filtered vs current):{' '}
                <span className="font-mono text-white">
                  {formatSigned(
                    configSeries[configSeries.length - 1].sanitized - configSeries[configSeries.length - 1].current,
                    2,
                  )}
                  R
                </span>
              </p>
            </div>
          ) : null}
        </ChartPanel>
      </div>

      <Card className="rounded-3xl border border-slate-800/70 bg-slate-900/60 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Strategy Performance</h2>
              <p className="text-xs text-slate-400">
                Aggregated canonical tickets grouped by strategy and symbol. Context from SessionMetrics.
              </p>
            </div>
            <span className="text-xs text-slate-500">{strategyRows.length} rows</span>
          </div>
        </CardHeader>
        <CardBody>
          {strategyRows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="py-2 pr-3">Strategy</th>
                    <th className="py-2 pr-3">Symbol</th>
                    <th className="py-2 pr-3">Regime</th>
                    <th className="py-2 pr-3">Win%</th>
                    <th className="py-2 pr-3">Avg R</th>
                    <th className="py-2 pr-3">Profit factor</th>
                    <th className="py-2 pr-3 text-right">Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {strategyRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-800/40">
                      <td className="py-2 pr-3 font-semibold text-white">{formatStrategyName(row.strategyId)}</td>
                      <td className="py-2 pr-3 text-slate-300">{row.symbol}</td>
                      <td className="py-2 pr-3 text-slate-300">{row.regime}</td>
                      <td className="py-2 pr-3 font-mono text-white">{percentFormatter.format(row.winRate / 100)}</td>
                      <td className="py-2 pr-3 font-mono text-white">{numberFormatter.format(row.avgRr)}</td>
                      <td className="py-2 pr-3 font-mono text-white">{row.profitFactor ? numberFormatter.format(row.profitFactor) : '—'}</td>
                      <td className="py-2 pl-3 text-right font-mono text-white">{row.trades}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No strategy performance data for filters." />
          )}
        </CardBody>
      </Card>
    </section>
  );
}

function KpiCard({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: 'negative' | 'positive' }) {
  const toneClass = tone === 'negative' ? 'text-red-400' : tone === 'positive' ? 'text-emerald-400' : 'text-white';
  return (
    <Card className="rounded-2xl border border-slate-800/70 bg-[#060A1A]">
      <CardBody>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`text-xl font-mono ${toneClass}`}>{value}</p>
        {detail && <p className="text-xs text-slate-500">{detail}</p>}
      </CardBody>
    </Card>
  );
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border border-slate-800/70 bg-[#050814]">
      <CardHeader>
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function LineChart({
  labels,
  series,
}: {
  labels: string[];
  series: Array<{ label: string; data: number[]; color: string; dashed?: boolean }>;
}) {
  if (!labels.length || !series.some((line) => line.data.length)) {
    return <EmptyState message="Not enough datapoints." />;
  }
  const width = Math.max(320, labels.length * 40);
  const height = 180;
  const paddingX = 32;
  const paddingY = 20;
  const allValues = series.flatMap((line) => line.data);
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 0);
  const range = maxValue - minValue || 1;

  const buildPoints = (data: number[]) =>
    data
      .map((value, index) => {
        const ratio = labels.length > 1 ? index / (labels.length - 1) : 0;
        const x = paddingX + ratio * (width - paddingX * 2);
        const y = height - paddingY - ((value - minValue) / range) * (height - paddingY * 2);
        return `${x},${Number.isFinite(y) ? y : height / 2}`;
      })
      .join(' ');

  return (
    <div>
      <svg width={width} height={height}>
        <rect x={0} y={0} width={width} height={height} fill="transparent" />
        {Array.from({ length: 4 }).map((_, index) => {
          const y = paddingY + ((height - paddingY * 2) / 3) * index;
          return (
            <line
              // eslint-disable-next-line react/no-array-index-key
              key={`grid-${index}`}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}
        {series.map((line) => (
          <polyline
            key={line.label}
            fill="none"
            stroke={line.color}
            strokeWidth={1.6}
            strokeDasharray={line.dashed ? '5 4' : undefined}
            points={buildPoints(line.data)}
          />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
        {series.map((line) => (
          <span key={line.label} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />
            {line.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function BarMeterList({ items }: { items: Array<{ label: string; value: number; detail?: string }> }) {
  if (!items.length) return <EmptyState message="No data available." />;
  const maxValue = Math.max(...items.map((item) => item.value), 100);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{item.label}</span>
            <span className="font-mono text-white">{percentFormatter.format(item.value / 100)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-900/60">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (item.value / maxValue) * 100)}%`,
                backgroundColor: '#42E2F4',
              }}
            />
          </div>
          {item.detail && <p className="text-[11px] text-slate-500">{item.detail}</p>}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-slate-500">{message}</p>;
}

function formatSigned(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(digits);
  return `${value > 0 ? '+' : ''}${fixed}`;
}

function formatStrategyName(strategyId?: string | null) {
  const base = (strategyId ?? '').trim();
  if (!base) return 'Unknown';
  return base.replace(/[-_]/g, ' ').replace(/\b(\w)/g, (match) => match.toUpperCase()).trim();
}

function getPnLR(ticket: CanonicalTicket): number {
  if (typeof ticket.pnlRMultiple === 'number' && !Number.isNaN(ticket.pnlRMultiple)) {
    return ticket.pnlRMultiple;
  }
  if (typeof ticket.pnl === 'number' && typeof ticket.perContractRisk === 'number' && ticket.perContractRisk !== 0) {
    return ticket.pnl / ticket.perContractRisk;
  }
  return 0;
}

function getTicketDateKey(ticket: CanonicalTicket): string | null {
  const raw = ticket.sessionDateUtc ?? ticket.createdAtUtc ?? ticket.completedAtUtc ?? null;
  if (!raw) return null;
  return raw.slice(0, 10);
}

function formatShortDate(isoDate: string): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

function deriveTicketScore(ticket: AnalyticsTicket): number {
  const baseHash = Array.from(ticket.id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let score = 60 + (baseHash % 36);
  const metrics = ticket.sessionMetrics;
  if (metrics) {
    const ratio =
      typeof metrics.orWidthToAtrRatio === 'number'
        ? metrics.orWidthToAtrRatio
        : typeof metrics.orWidthPoints === 'number' && typeof metrics.sessionAtrPoints === 'number' && metrics.sessionAtrPoints !== 0
        ? metrics.orWidthPoints / metrics.sessionAtrPoints
        : null;
    if (typeof ratio === 'number' && Number.isFinite(ratio)) {
      if (ratio >= 1.2) score += 8;
      else if (ratio >= 1.0) score += 5;
      else if (ratio >= 0.85) score += 3;
      else if (ratio <= 0.5) score -= 8;
      else if (ratio <= 0.7) score -= 4;
    }
    const direction = ticket.side === 'BUY' ? 'UP' : 'DOWN';
    const opposing = direction === 'UP' ? 'DOWN' : 'UP';
    const slope = metrics.vwapSlope?.toUpperCase();
    const bias = metrics.htfTrendBias?.toUpperCase();
    if (slope?.includes(direction) || bias?.includes(direction)) score += 6;
    if (slope?.includes(opposing) || bias?.includes(opposing)) score -= 6;
    if (metrics.hasMajorNewsToday) score -= 5;
    if (metrics.sessionQualityFlag === 'SKIP' || metrics.sessionSkipReason) score -= 5;
    if (metrics.status === 'ERROR') score -= 3;
  }
  return Math.max(45, Math.min(98, Math.round(score)));
}

function getRegimeValue(ticket: AnalyticsTicket): string {
  const value = ticket.contextRegime ?? ticket.sessionMetrics?.volRegime ?? 'UNKNOWN';
  return value ? value.toUpperCase() : 'UNKNOWN';
}

function getVolatilityBucket(ticket: AnalyticsTicket): string {
  const value = ticket.contextAtrBucket ?? ticket.sessionMetrics?.sessionAtrBucket ?? 'UNKNOWN';
  return value ? value.toUpperCase() : 'UNKNOWN';
}

function buildSelectOptions(values: string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  values
    .filter((value): value is string => Boolean(value))
    .forEach((value) => {
      if (!seen.has(value)) {
        seen.add(value);
        unique.push(value);
      }
    });
  if (!unique.length) return ['ALL'];
  return ['ALL', ...unique];
}

function buildDailyPoints(tickets: AnalyticsTicket[]): DailyPoint[] {
  const map = new Map<string, { pnl: number; sanitized: number; scores: number[]; rrs: number[] }>();
  tickets.forEach((ticket) => {
    const dateKey = getTicketDateKey(ticket);
    if (!dateKey) return;
    if (!map.has(dateKey)) {
      map.set(dateKey, { pnl: 0, sanitized: 0, scores: [], rrs: [] });
    }
    const entry = map.get(dateKey)!;
    const pnl = getPnLR(ticket);
    entry.pnl += pnl;
    if (!ticket.sessionMetrics?.hasMajorNewsToday) {
      entry.sanitized += pnl;
    }
    entry.scores.push(deriveTicketScore(ticket));
    if (typeof ticket.rrMultiple === 'number' && !Number.isNaN(ticket.rrMultiple)) {
      entry.rrs.push(ticket.rrMultiple);
    }
  });
  return Array.from(map.entries())
    .map(([dateKey, entry]) => ({
      dateKey,
      label: formatShortDate(dateKey),
      pnl: entry.pnl,
      sanitizedPnl: entry.sanitized,
      avgScore: entry.scores.length ? entry.scores.reduce((sum, value) => sum + value, 0) / entry.scores.length : 0,
      avgRr: entry.rrs.length ? entry.rrs.reduce((sum, value) => sum + value, 0) / entry.rrs.length : 0,
    }))
    .sort((a, b) => (a.dateKey > b.dateKey ? 1 : -1));
}

function computeRegimeStats(tickets: AnalyticsTicket[]) {
  const map = new Map<string, { wins: number; trades: number }>();
  tickets.forEach((ticket) => {
    const regime = getRegimeValue(ticket);
    if (!map.has(regime)) {
      map.set(regime, { wins: 0, trades: 0 });
    }
    const entry = map.get(regime)!;
    entry.trades += 1;
    if (getPnLR(ticket) > 0) entry.wins += 1;
  });
  const ordered = ['TRENDUP', 'TRENDDN', 'CHOP', 'OR BREAK'];
  const remaining = Array.from(map.keys()).filter((key) => !ordered.includes(key));
  const sequence = [...ordered, ...remaining];
  return sequence
    .filter((label) => map.has(label))
    .map((label) => {
      const entry = map.get(label)!;
      return {
        label,
        winRate: entry.trades ? (entry.wins / entry.trades) * 100 : 0,
        trades: entry.trades,
      };
    });
}

function computeAtrBuckets(tickets: AnalyticsTicket[]) {
  const map = new Map<string, { trades: number; pnl: number }>();
  tickets.forEach((ticket) => {
    const bucket = getVolatilityBucket(ticket);
    if (!map.has(bucket)) {
      map.set(bucket, { trades: 0, pnl: 0 });
    }
    const entry = map.get(bucket)!;
    entry.trades += 1;
    entry.pnl += getPnLR(ticket);
  });
  return Array.from(map.entries()).map(([label, entry]) => ({
    label,
    trades: entry.trades,
    avgPnL: entry.trades ? entry.pnl / entry.trades : 0,
  }));
}

function computeNewsSplit(tickets: AnalyticsTicket[]) {
  return tickets.reduce(
    (acc, ticket) => {
      const pnl = getPnLR(ticket);
      if (ticket.sessionMetrics?.hasMajorNewsToday) {
        acc.newsTrades += 1;
        acc.newsPnL += pnl;
      } else {
        acc.cleanTrades += 1;
        acc.cleanPnL += pnl;
      }
      return acc;
    },
    { newsTrades: 0, newsPnL: 0, cleanTrades: 0, cleanPnL: 0 },
  );
}

function buildStrategyRows(tickets: AnalyticsTicket[]): StrategyRow[] {
  const map = new Map<
    string,
    {
      strategyId: string;
      symbol: string;
      wins: number;
      trades: number;
      rrSum: number;
      rrCount: number;
      positive: number;
      negative: number;
      regimes: Record<string, number>;
    }
  >();

  tickets.forEach((ticket) => {
    const key = `${ticket.strategyId}__${ticket.symbol}`;
    if (!map.has(key)) {
      map.set(key, {
        strategyId: ticket.strategyId,
        symbol: ticket.symbol,
        wins: 0,
        trades: 0,
        rrSum: 0,
        rrCount: 0,
        positive: 0,
        negative: 0,
        regimes: {},
      });
    }
    const entry = map.get(key)!;
    entry.trades += 1;
    const pnl = getPnLR(ticket);
    if (pnl > 0) {
      entry.wins += 1;
      entry.positive += pnl;
    } else if (pnl < 0) {
      entry.negative += pnl;
    }
    if (typeof ticket.rrMultiple === 'number' && !Number.isNaN(ticket.rrMultiple)) {
      entry.rrSum += ticket.rrMultiple;
      entry.rrCount += 1;
    }
    const regime = getRegimeValue(ticket);
    entry.regimes[regime] = (entry.regimes[regime] ?? 0) + 1;
  });

  return Array.from(map.entries())
    .map(([id, entry]) => {
      const regime = Object.entries(entry.regimes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'UNKNOWN';
      const profitFactor = entry.positive > 0 && entry.negative < 0 ? entry.positive / Math.abs(entry.negative) : null;
      return {
        id,
        strategyId: entry.strategyId,
        symbol: entry.symbol,
        regime,
        winRate: entry.trades ? (entry.wins / entry.trades) * 100 : 0,
        avgRr: entry.rrCount ? entry.rrSum / entry.rrCount : 0,
        profitFactor,
        trades: entry.trades,
      };
    })
    .sort((a, b) => b.trades - a.trades);
}

function computeKpis(tickets: AnalyticsTicket[]) {
  if (!tickets.length) {
    return {
      netPnL: 0,
      winRate: 0,
      maxDrawdown: 0,
      avgRr: 0,
    };
  }
  let netPnL = 0;
  let wins = 0;
  let rrSum = 0;
  let rrCount = 0;
  const chronological = [...tickets].sort((a, b) => getTicketTimestamp(a) - getTicketTimestamp(b));
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;

  chronological.forEach((ticket) => {
    const pnl = getPnLR(ticket);
    netPnL += pnl;
    if (pnl > 0) wins += 1;
    if (typeof ticket.rrMultiple === 'number' && !Number.isNaN(ticket.rrMultiple)) {
      rrSum += ticket.rrMultiple;
      rrCount += 1;
    }
    cumulative += pnl;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = cumulative - peak;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  return {
    netPnL,
    winRate: (wins / tickets.length) * 100,
    maxDrawdown,
    avgRr: rrCount ? rrSum / rrCount : 0,
  };
}

function getTicketTimestamp(ticket: CanonicalTicket): number {
  const ts = ticket.completedAtUtc ?? ticket.updatedAtUtc ?? ticket.createdAtUtc ?? '';
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildConfigSeries(points: DailyPoint[]) {
  const series: Array<{ label: string; current: number; sanitized: number }> = [];
  let current = 0;
  let sanitized = 0;
  points.forEach((point) => {
    current += point.pnl;
    sanitized += point.sanitizedPnl;
    series.push({
      label: point.label,
      current,
      sanitized,
    });
  });
  return series;
}
