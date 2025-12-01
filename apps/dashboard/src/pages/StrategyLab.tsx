import React from 'react';
import type { CanonicalTicket } from '@prism-apex/shared';
import { Card, CardBody, CardHeader } from '../ui/Card';
import FiltersBar from '../ui/FiltersBar';
import Badge from '../ui/Badge';
import {
  fetchAnalyticsCanonicalTickets,
  fetchSessionMetricsBatch,
  makeSessionMetricsKey,
  type SessionMetricsDto,
} from '../lib/api';

type FiltersState = {
  symbol: string;
  strategy: string;
};

type StrategyLabTicket = CanonicalTicket & { sessionMetrics?: SessionMetricsDto | null };

type StrategySummary = {
  strategyId: string;
  trades: number;
  winRate: number;
  avgRr: number;
  avgRisk: number;
  avgReward: number;
  netPnL: number;
  lastTradeUtc: string | null;
  newsTrades: number;
  newsPnL: number;
  cleanTrades: number;
  cleanPnL: number;
  symbols: Array<{ symbol: string; trades: number; pnl: number }>;
  regimes: Array<{ label: string; trades: number; winRate: number }>;
  atrBuckets: Array<{ label: string; trades: number; avgPnL: number }>;
};

const FALLBACK_SUMMARY: StrategySummary = {
  strategyId: 'N/A',
  trades: 0,
  winRate: 0,
  avgRr: 0,
  avgRisk: 0,
  avgReward: 0,
  netPnL: 0,
  lastTradeUtc: null,
  newsTrades: 0,
  newsPnL: 0,
  cleanTrades: 0,
  cleanPnL: 0,
  symbols: [],
  regimes: [],
  atrBuckets: [],
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: '2-digit',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
};

export default function StrategyLabPage() {
  const [tickets, setTickets] = React.useState<CanonicalTicket[]>([]);
  const [sessionMetricsMap, setSessionMetricsMap] = React.useState<Record<string, SessionMetricsDto | null>>({});
  const [filters, setFilters] = React.useState<FiltersState>({ symbol: 'ALL', strategy: 'ALL' });
  const [selectedStrategy, setSelectedStrategy] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function loadTickets() {
      setIsLoading(true);
      setError(null);
      try {
        const canonical = await fetchAnalyticsCanonicalTickets({ limit: 400 });
        if (cancelled) return;
        setTickets(canonical);
        const requests = canonical
          .filter((ticket) => Boolean(ticket.sessionDateUtc))
          .map((ticket) => ({ symbol: ticket.symbol, sessionDate: ticket.sessionDateUtc as string }));
        const metrics = await fetchSessionMetricsBatch(requests);
        if (cancelled) return;
        setSessionMetricsMap(metrics);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadTickets();
    return () => {
      cancelled = true;
    };
  }, []);

  const enrichedTickets = React.useMemo<StrategyLabTicket[]>(() => {
    if (!tickets.length) return [];
    return tickets.map((ticket) => {
      const key = makeSessionMetricsKey(ticket.symbol, ticket.sessionDateUtc);
      return {
        ...ticket,
        sessionMetrics: sessionMetricsMap[key] ?? null,
      };
    });
  }, [tickets, sessionMetricsMap]);

  const symbolOptions = React.useMemo(() => buildSelectOptions(enrichedTickets.map((ticket) => ticket.symbol)), [enrichedTickets]);
  const strategyOptions = React.useMemo(() => buildSelectOptions(enrichedTickets.map((ticket) => ticket.strategyId)), [enrichedTickets]);

  const filteredTickets = React.useMemo(() => {
    return enrichedTickets.filter((ticket) => {
      if (filters.symbol !== 'ALL' && ticket.symbol !== filters.symbol) return false;
      if (filters.strategy !== 'ALL' && ticket.strategyId !== filters.strategy) return false;
      return true;
    });
  }, [enrichedTickets, filters]);

  const strategySummaries = React.useMemo(
    () => buildStrategySummaries(filteredTickets),
    [filteredTickets],
  );

  React.useEffect(() => {
    if (!strategySummaries.length) {
      setSelectedStrategy(null);
      return;
    }
    setSelectedStrategy((prev) => {
      if (prev && strategySummaries.some((summary) => summary.strategyId === prev)) {
        return prev;
      }
      return strategySummaries[0].strategyId;
    });
  }, [strategySummaries]);

  const selectedSummary = React.useMemo(
    () => strategySummaries.find((summary) => summary.strategyId === selectedStrategy) ?? null,
    [selectedStrategy, strategySummaries],
  );

  const suggestions = React.useMemo(() => buildSuggestions(selectedSummary ?? FALLBACK_SUMMARY), [selectedSummary]);

  return (
    <section className="space-y-5">
      <header className="space-y-1 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Labs</p>
        <h1 className="text-3xl font-semibold tracking-tight">Strategy Lab</h1>
        <p className="text-sm text-slate-400">
          Review canonical ticket outcomes to guide ORR, OSB, and VWAP First-Touch config changes. This is a read-only diagnostic view.
        </p>
      </header>

      <FiltersBar
        selects={[
          {
            label: 'Strategy',
            value: filters.strategy,
            options: strategyOptions,
            onChange: (value) => setFilters((prev) => ({ ...prev, strategy: value })),
          },
          {
            label: 'Symbol',
            value: filters.symbol,
            options: symbolOptions,
            onChange: (value) => setFilters((prev) => ({ ...prev, symbol: value })),
          },
        ]}
      >
        <span className="text-xs text-slate-500">{isLoading ? 'Loading canonical tickets…' : `${filteredTickets.length} tickets loaded`}</span>
      </FiltersBar>

      {error && <p className="text-sm text-red-400">Failed to load Strategy Lab data: {error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,320px)]">
        <Card className="rounded-3xl border border-slate-800/70 bg-slate-900/60 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between text-slate-200">
              <strong>Config Sets</strong>
              <span className="text-xs text-slate-500">{strategySummaries.length} active</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {strategySummaries.length === 0 && !isLoading && (
              <p className="text-sm text-slate-500">No strategies found for the current filters.</p>
            )}
            {strategySummaries.map((summary) => (
              <button
                key={summary.strategyId}
                type="button"
                onClick={() => setSelectedStrategy(summary.strategyId)}
                className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                  selectedStrategy === summary.strategyId
                    ? 'border-cyan-400/70 bg-slate-900/80 shadow-[0_0_10px_rgba(74,222,255,0.35)]'
                    : 'border-slate-800/70 bg-slate-900/40 hover:border-cyan-400/40'
                }`}
              >
                <div className="flex items-center justify-between text-sm text-white">
                  <span>{formatStrategyName(summary.strategyId)}</span>
                  <Badge tone={summary.netPnL >= 0 ? 'green' : 'red'}>{formatSigned(summary.netPnL, 1)}R</Badge>
                </div>
                <p className="text-xs text-slate-400">
                  {summary.trades} trades · Win {formatPercent(summary.winRate / 100)} · Avg R {formatNumber(summary.avgRr)}
                </p>
                <p className="text-[11px] text-slate-500">
                  Last ticket {summary.lastTradeUtc ? new Date(summary.lastTradeUtc).toLocaleString(undefined, DATE_OPTIONS) : '—'}
                </p>
              </button>
            ))}

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-amber-200">Suggestions</p>
                {suggestions.map((text, index) => (
                  <span
                    key={`${text}-${index}`}
                    className="inline-flex items-center rounded-full border border-amber-200/60 px-2 py-1 text-[11px] text-amber-100"
                  >
                    {text}
                  </span>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="rounded-3xl border border-slate-800/70 bg-slate-900/60 shadow-lg">
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Active Config Snapshot</p>
              <h2 className="text-xl font-semibold text-white">{selectedSummary ? formatStrategyName(selectedSummary.strategyId) : 'Select a strategy'}</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {!selectedSummary && <p className="text-sm text-slate-500">Select a strategy to inspect its performance signals.</p>}
            {selectedSummary && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Trade count" value={selectedSummary.trades.toLocaleString()} />
                  <InfoRow label="Win rate" value={formatPercent(selectedSummary.winRate / 100)} />
                  <InfoRow label="Avg R multiple" value={formatNumber(selectedSummary.avgRr)} />
                  <InfoRow label="Avg per-contract risk" value={`${formatNumber(selectedSummary.avgRisk)} pts`} />
                  <InfoRow label="Avg reward" value={`${formatNumber(selectedSummary.avgReward)} pts`} />
                  <InfoRow label="Net PnL" value={`${formatSigned(selectedSummary.netPnL, 1)}R`} />
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Symbol breakdown</p>
                  {selectedSummary.symbols.length === 0 ? (
                    <p className="text-sm text-slate-500">No symbol stats yet.</p>
                  ) : (
                    <div className="mt-2 space-y-1 text-sm text-slate-300">
                      {selectedSummary.symbols.map((symbol) => (
                        <div key={symbol.symbol} className="flex items-center justify-between font-mono">
                          <span>{symbol.symbol}</span>
                          <span className={symbol.pnl < 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {formatSigned(symbol.pnl, 1)}R / {symbol.trades} trades
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">News impact</p>
                  <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Major news</p>
                      <p className={selectedSummary.newsPnL < 0 ? 'text-red-400 font-mono' : 'text-emerald-400 font-mono'}>
                        {formatSigned(selectedSummary.newsPnL, 1)}R
                      </p>
                      <p className="text-xs text-slate-500">{selectedSummary.newsTrades} trades</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Normal sessions</p>
                      <p className={selectedSummary.cleanPnL < 0 ? 'text-red-400 font-mono' : 'text-emerald-400 font-mono'}>
                        {formatSigned(selectedSummary.cleanPnL, 1)}R
                      </p>
                      <p className="text-xs text-slate-500">{selectedSummary.cleanTrades} trades</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card className="rounded-3xl border border-slate-800/70 bg-slate-900/60 shadow-lg">
          <CardHeader>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Backtest Context</p>
              <h2 className="text-lg font-semibold text-white">Regime & ATR Diagnostics</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {!selectedSummary && <p className="text-sm text-slate-500">Select a strategy to view its contextual performance.</p>}
            {selectedSummary && (
              <>
                <ContextList
                  title="Regime outcomes"
                  items={selectedSummary.regimes.map((regime) => ({
                    label: regime.label,
                    detail: `${regime.trades} trades`,
                    value: formatPercent(regime.winRate / 100),
                  }))}
                />
                <ContextList
                  title="ATR buckets"
                  items={selectedSummary.atrBuckets.map((bucket) => ({
                    label: bucket.label,
                    detail: `${bucket.trades} trades`,
                    value: `${formatSigned(bucket.avgPnL, 1)}R avg`,
                  }))}
                />
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

function buildStrategySummaries(tickets: StrategyLabTicket[]): StrategySummary[] {
  const map = new Map<
    string,
    {
      strategyId: string;
      trades: number;
      wins: number;
      rrSum: number;
      rrCount: number;
      riskSum: number;
      rewardSum: number;
      netPnL: number;
      lastTradeUtc: string | null;
      newsTrades: number;
      newsPnL: number;
      cleanTrades: number;
      cleanPnL: number;
      symbols: Map<string, { trades: number; pnl: number }>;
      regimes: Map<string, { trades: number; wins: number }>;
      atrBuckets: Map<string, { trades: number; pnl: number }>;
    }
  >();

  tickets.forEach((ticket) => {
    const id = ticket.strategyId;
    if (!map.has(id)) {
      map.set(id, {
        strategyId: id,
        trades: 0,
        wins: 0,
        rrSum: 0,
        rrCount: 0,
        riskSum: 0,
        rewardSum: 0,
        netPnL: 0,
        lastTradeUtc: null,
        newsTrades: 0,
        newsPnL: 0,
        cleanTrades: 0,
        cleanPnL: 0,
        symbols: new Map(),
        regimes: new Map(),
        atrBuckets: new Map(),
      });
    }
    const entry = map.get(id)!;
    entry.trades += 1;
    const pnlR = getPnLR(ticket);
    entry.netPnL += pnlR;
    if (pnlR > 0) entry.wins += 1;
    if (typeof ticket.rrMultiple === 'number' && !Number.isNaN(ticket.rrMultiple)) {
      entry.rrSum += ticket.rrMultiple;
      entry.rrCount += 1;
    }
    if (typeof ticket.perContractRisk === 'number' && !Number.isNaN(ticket.perContractRisk)) {
      entry.riskSum += ticket.perContractRisk;
    }
    if (typeof ticket.expectedReward === 'number' && !Number.isNaN(ticket.expectedReward)) {
      entry.rewardSum += ticket.expectedReward;
    }
    const ts = getTicketTimestamp(ticket);
    if (ts && (!entry.lastTradeUtc || ts > Date.parse(entry.lastTradeUtc))) {
      entry.lastTradeUtc = new Date(ts).toISOString();
    }
    if (ticket.sessionMetrics?.hasMajorNewsToday) {
      entry.newsTrades += 1;
      entry.newsPnL += pnlR;
    } else {
      entry.cleanTrades += 1;
      entry.cleanPnL += pnlR;
    }
    const symbolRecord = entry.symbols.get(ticket.symbol) ?? { trades: 0, pnl: 0 };
    symbolRecord.trades += 1;
    symbolRecord.pnl += pnlR;
    entry.symbols.set(ticket.symbol, symbolRecord);

    const regime = ticket.sessionMetrics?.volRegime?.toUpperCase() ?? 'UNKNOWN';
    const regimeRecord = entry.regimes.get(regime) ?? { trades: 0, wins: 0 };
    regimeRecord.trades += 1;
    if (pnlR > 0) regimeRecord.wins += 1;
    entry.regimes.set(regime, regimeRecord);

    const atrBucket = ticket.sessionMetrics?.sessionAtrBucket?.toUpperCase() ?? 'UNKNOWN';
    const atrRecord = entry.atrBuckets.get(atrBucket) ?? { trades: 0, pnl: 0 };
    atrRecord.trades += 1;
    atrRecord.pnl += pnlR;
    entry.atrBuckets.set(atrBucket, atrRecord);
  });

  return Array.from(map.values())
    .map<StrategySummary>((entry) => ({
      strategyId: entry.strategyId,
      trades: entry.trades,
      winRate: entry.trades ? (entry.wins / entry.trades) * 100 : 0,
      avgRr: entry.rrCount ? entry.rrSum / entry.rrCount : 0,
      avgRisk: entry.trades ? entry.riskSum / entry.trades : 0,
      avgReward: entry.trades ? entry.rewardSum / entry.trades : 0,
      netPnL: entry.netPnL,
      lastTradeUtc: entry.lastTradeUtc,
      newsTrades: entry.newsTrades,
      newsPnL: entry.newsPnL,
      cleanTrades: entry.cleanTrades,
      cleanPnL: entry.cleanPnL,
      symbols: Array.from(entry.symbols.entries()).map(([symbol, stats]) => ({
        symbol,
        trades: stats.trades,
        pnl: stats.pnl,
      })),
      regimes: Array.from(entry.regimes.entries()).map(([label, stats]) => ({
        label,
        trades: stats.trades,
        winRate: stats.trades ? (stats.wins / stats.trades) * 100 : 0,
      })),
      atrBuckets: Array.from(entry.atrBuckets.entries()).map(([label, stats]) => ({
        label,
        trades: stats.trades,
        avgPnL: stats.trades ? stats.pnl / stats.trades : 0,
      })),
    }))
    .sort((a, b) => b.trades - a.trades);
}

function buildSelectOptions(values: string[]): string[] {
  const unique: string[] = [];
  values.forEach((value) => {
    if (!value) return;
    if (!unique.includes(value)) {
      unique.push(value);
    }
  });
  if (!unique.length) return ['ALL'];
  return ['ALL', ...unique];
}

function buildSuggestions(summary: StrategySummary): string[] {
  const items: string[] = [];
  if (summary.trades === 0) return items;
  if (summary.newsTrades > 0 && summary.newsPnL < 0) {
    items.push('Consider suppressing entries during major news windows.');
  }
  if (summary.avgRisk > 15) {
    items.push('Review per-contract risk — average exceeds 15 points.');
  }
  if (summary.winRate < 40) {
    items.push('Win rate under 40% — verify min score & RR bands.');
  }
  if (summary.regimes.some((regime) => regime.label.includes('CHOP') && regime.winRate < 35)) {
    items.push('Degradation in chop — adjust chop-specific config.');
  }
  if (!items.length) {
    items.push('No major alerts — continue monitoring lab metrics.');
  }
  return items.slice(0, 3);
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

function getTicketTimestamp(ticket: CanonicalTicket): number {
  const ts = ticket.completedAtUtc ?? ticket.updatedAtUtc ?? ticket.createdAtUtc ?? '';
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatStrategyName(strategyId?: string | null) {
  const base = (strategyId ?? '').trim();
  if (!base) return 'Unknown';
  return base.replace(/[-_]/g, ' ').replace(/\b(\w)/g, (match) => match.toUpperCase()).trim();
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function formatSigned(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-mono text-white">{value}</p>
    </div>
  );
}

function ContextList({ title, items }: { title: string; items: Array<{ label: string; detail: string; value: string }> }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className="mt-2 space-y-2 text-sm">
          {items.map((item) => (
            <div key={`${title}-${item.label}`} className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2">
              <div>
                <p className="text-white">{item.label}</p>
                <p className="text-xs text-slate-500">{item.detail}</p>
              </div>
              <p className="font-mono text-emerald-300">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
