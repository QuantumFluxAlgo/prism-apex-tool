import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FiltersBar from '../ui/FiltersBar';
import { Card, CardBody, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { fetchJson } from '../lib/apiBase';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SYMBOL = 'ES=F';

type SymbolCoverage = {
  symbol: string;
  bars: number;
  minTsUtc: string | null;
  maxTsUtc: string | null;
  latestTsUtc: string | null;
  latestClose: number | null;
  latestVolume: number | null;
};

type PriceSeriesPoint = { bucket: string; close: number | null; volume: number | null };
type TicketSeriesPoint = { bucket: string; trades: number; pnl: number | null };

type ReportsDashboardResponse = {
  generatedAt: string;
  appliedFilters: {
    symbol: string;
    strategy: string;
    fromUtc: string;
    toUtc: string;
    interval: 'hour' | 'day';
  };
  availableSymbols: string[];
  availableStrategies: string[];
  symbolCoverage: SymbolCoverage[];
  priceSeries: {
    points: PriceSeriesPoint[];
    baseline: number | null;
    change: { absolute: number | null; percent: number | null };
  };
  ticketSeries: { points: TicketSeriesPoint[] };
  ticketSummary: {
    total: number;
    inRange: number;
    last24h: number;
    avgPnl: number | null;
    grossPnl: number | null;
    bySymbol: Array<{ symbol: string; trades: number; pnl: number | null }>;
    byStrategy: Array<{ strategy: string; trades: number; pnl: number | null }>;
  };
};

type FiltersState = {
  from: string;
  to: string;
  symbol: string;
  interval: 'hour' | 'day';
  strategy: string;
  includeTickets: boolean;
};

const INTERVAL_OPTIONS: Array<{ label: string; value: FiltersState['interval'] }> = [
  { label: 'Hourly buckets', value: 'hour' },
  { label: 'Daily buckets', value: 'day' },
];

const STRATEGY_DEFAULT_OPTION = 'ALL';

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);

function formatDateLabel(bucket: string, interval: 'hour' | 'day') {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) return bucket;
  if (interval === 'hour') {
    return date.toLocaleString(undefined, {
      hour12: false,
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
  });
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatDelta(value: number | null | undefined, digits = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  const magnitude = Math.abs(value).toFixed(digits);
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${magnitude}`;
}

function diffDays(min: string | null, max: string | null) {
  if (!min || !max) return null;
  const start = new Date(min).getTime();
  const end = new Date(max).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, Math.round((end - start) / DAY_MS));
}

export default function ReportsPage() {
  const [filters, setFilters] = useState<FiltersState>({
    from: daysAgoIso(6),
    to: todayIso(),
    symbol: DEFAULT_SYMBOL,
    interval: 'day',
    strategy: STRATEGY_DEFAULT_OPTION,
    includeTickets: true,
  });
  const [data, setData] = useState<ReportsDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const symbolOptions = useMemo(() => {
    if (data?.availableSymbols?.length) return data.availableSymbols;
    return [DEFAULT_SYMBOL];
  }, [data]);

  const strategyOptions = useMemo(() => {
    const strategies = data?.availableStrategies ?? [];
    const unique = Array.from(new Set([STRATEGY_DEFAULT_OPTION, ...strategies.map((s) => s.toUpperCase())]));
    return unique;
  }, [data]);

  useEffect(() => {
    if (symbolOptions.length && !symbolOptions.includes(filters.symbol)) {
      setFilters((prev) => ({ ...prev, symbol: symbolOptions[0] }));
    }
  }, [symbolOptions, filters.symbol]);

  useEffect(() => {
    if (!strategyOptions.includes(filters.strategy)) {
      setFilters((prev) => ({ ...prev, strategy: STRATEGY_DEFAULT_OPTION }));
    }
  }, [strategyOptions, filters.strategy]);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        symbol: filters.symbol,
        from: filters.from,
        to: filters.to,
        interval: filters.interval,
      });
      if (filters.strategy && filters.strategy !== STRATEGY_DEFAULT_OPTION) {
        params.set('strategy', filters.strategy);
      }
      const res = (await fetchJson(`/api/reports/dashboard?${params.toString()}`)) as ReportsDashboardResponse;
      setData(res);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [filters.symbol, filters.from, filters.to, filters.interval, filters.strategy]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const activityRows = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, TicketSeriesPoint>();
    const ticketPoints = data.ticketSeries?.points ?? [];
    ticketPoints.forEach((point) => map.set(point.bucket, point));
    return data.priceSeries.points.map((point, index, arr) => {
      const previous = index > 0 ? arr[index - 1].close : null;
      const delta =
        typeof point.close === 'number' && typeof previous === 'number' ? point.close - previous : null;
      const tickets = map.get(point.bucket);
      return {
        bucket: point.bucket,
        close: point.close,
        delta,
        volume: point.volume,
        trades: tickets?.trades ?? 0,
        pnl: tickets?.pnl ?? null,
      };
    });
  }, [data]);

  const coverageRows = useMemo(() => {
    if (!data?.symbolCoverage?.length) return [];
    return data.symbolCoverage
      .map((row) => ({
        ...row,
        coverageDays: diffDays(row.minTsUtc, row.maxTsUtc),
      }))
      .slice(0, 12);
  }, [data]);

  const totalTrades = useMemo(
    () => activityRows.reduce((sum, row) => sum + (row.trades ?? 0), 0),
    [activityRows],
  );

  const activityRowsSorted = useMemo(
    () =>
      [...activityRows].sort(
        (a, b) => new Date(b.bucket).getTime() - new Date(a.bucket).getTime(),
      ),
    [activityRows],
  );

  const ticketSeriesPoints = data?.ticketSeries?.points ?? [];
  const hasTicketSeriesPoints = ticketSeriesPoints.length > 0;

  const selects = [
    {
      label: 'Symbol',
      value: filters.symbol,
      options: symbolOptions.map((sym) => ({ label: sym, value: sym })),
      onChange: (value: string) => setFilters((prev) => ({ ...prev, symbol: value })),
    },
    {
      label: 'Interval',
      value: filters.interval,
      options: INTERVAL_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value })),
      onChange: (value: string) =>
        setFilters((prev) => ({
          ...prev,
          interval: (value as FiltersState['interval']) || prev.interval,
        })),
    },
    {
      label: 'Strategy',
      value: filters.strategy,
      options: strategyOptions.map((strategy) => ({
        label: strategy === STRATEGY_DEFAULT_OPTION ? 'All strategies' : strategy,
        value: strategy,
      })),
      onChange: (value: string) =>
        setFilters((prev) => ({
          ...prev,
          strategy: value || STRATEGY_DEFAULT_OPTION,
        })),
    },
  ];

  const intervalLabel = INTERVAL_OPTIONS.find((opt) => opt.value === filters.interval)?.label ?? 'Buckets';

  return (
    <div className="space-y-4">
      <FiltersBar
        dateRange={{
          from: filters.from,
          to: filters.to,
          onChange: (from: string, to: string) =>
            setFilters((prev) => ({
              ...prev,
              from: from ?? prev.from,
              to: to ?? prev.to,
            })),
        }}
        selects={selects}
        toggles={[
          {
            label: 'Show ticket insights',
            checked: filters.includeTickets,
            onChange: (checked) => setFilters((prev) => ({ ...prev, includeTickets: checked })),
          },
        ]}
      >
        <Button size="sm" variant="ghost" disabled={isLoading} onClick={fetchDashboard}>
          {isLoading ? 'Loading…' : 'Refresh'}
        </Button>
      </FiltersBar>

      {error && <p className="text-sm text-red-400">Failed to load reports: {error}</p>}

      {lastRefreshed && (
        <p className="text-xs text-slate-400">
          Updated {lastRefreshed.toLocaleTimeString(undefined, { hour12: false })} · Range{' '}
          {filters.from} → {filters.to}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Price change"
          value={formatDelta(data?.priceSeries.change.absolute ?? null, 2)}
          detail={formatPercent(data?.priceSeries.change.percent)}
        />
        <StatCard
          label="Baseline price"
          value={formatNumber(data?.priceSeries.baseline, 4)}
          detail={`Symbol ${filters.symbol}`}
        />
        <StatCard label="Total trades in range" value={totalTrades.toLocaleString()} />
        <StatCard
          label="Avg ticket PnL"
          value={formatNumber(data?.ticketSummary.avgPnl, 2)}
          detail={`Gross ${formatNumber(data?.ticketSummary.grossPnl, 2)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <strong>Market activity · {intervalLabel}</strong>
        </CardHeader>
        <CardBody>
          {isLoading && !data && <p>Loading activity…</p>}
          {!activityRows.length && !isLoading && <p className="text-sm text-slate-400">No data for selection.</p>}
          {activityRowsSorted.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="py-2 pr-3">Bucket</th>
                    <th className="py-2 pr-3">Price</th>
                    <th className="py-2 pr-3">Δ</th>
                    <th className="py-2 pr-3">Volume</th>
                    <th className="py-2 pr-3">Trades</th>
                    <th className="py-2 pr-3">Ticket P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {activityRowsSorted.map((row) => (
                    <tr key={row.bucket} className="border-t border-slate-800/40">
                      <td className="py-2 pr-3">{formatDateLabel(row.bucket, filters.interval)}</td>
                      <td className="py-2 pr-3 font-mono">{formatNumber(row.close, 4)}</td>
                      <td className={`py-2 pr-3 font-mono ${row.delta && row.delta < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatDelta(row.delta, 4)}
                      </td>
                      <td className="py-2 pr-3">{row.volume ? row.volume.toLocaleString() : '—'}</td>
                      <td className="py-2 pr-3">{row.trades?.toLocaleString?.() ?? '—'}</td>
                      <td className={`py-2 pr-3 font-mono ${row.pnl && row.pnl < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatNumber(row.pnl, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <strong>Symbol coverage</strong>
        </CardHeader>
        <CardBody>
          {!coverageRows.length && <p className="text-sm text-slate-400">No bars captured yet.</p>}
          {coverageRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="py-2 pr-3">Symbol</th>
                    <th className="py-2 pr-3">Bars</th>
                    <th className="py-2 pr-3">Coverage</th>
                    <th className="py-2 pr-3">Last close</th>
                    <th className="py-2 pr-3">Last ingest</th>
                  </tr>
                </thead>
                <tbody>
                  {coverageRows.map((row) => (
                    <tr key={row.symbol} className="border-t border-slate-800/40">
                      <td className="py-2 pr-3 font-semibold">{row.symbol}</td>
                      <td className="py-2 pr-3">{row.bars.toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        {row.coverageDays !== null ? `${row.coverageDays} days` : '—'}
                      </td>
                      <td className="py-2 pr-3 font-mono">{formatNumber(row.latestClose, 4)}</td>
                      <td className="py-2 pr-3 text-xs text-slate-400">
                        {row.latestTsUtc ? new Date(row.latestTsUtc).toLocaleString(undefined, { hour12: false }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {filters.includeTickets && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <strong>Ticket summary</strong>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wide">Total (lifetime)</div>
                  <div className="text-lg font-semibold">{data?.ticketSummary.total?.toLocaleString() ?? '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wide">Range trades</div>
                  <div className="text-lg font-semibold">{data?.ticketSummary.inRange?.toLocaleString() ?? '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wide">Last 24h</div>
                  <div className="text-lg font-semibold">{data?.ticketSummary.last24h?.toLocaleString() ?? '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wide">Avg P/L</div>
                  <div className="text-lg font-semibold">{formatNumber(data?.ticketSummary.avgPnl, 2)}</div>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="text-xs uppercase text-slate-400 mb-1">Top symbols</div>
                  <table className="w-full text-sm">
                    <tbody>
                      {data?.ticketSummary.bySymbol?.map((row) => (
                        <tr key={row.symbol}>
                          <td className="py-1 pr-3">{row.symbol}</td>
                          <td className="py-1 pr-3 text-right text-slate-400">{row.trades.toLocaleString()}</td>
                          <td className={`py-1 text-right font-mono ${row.pnl && row.pnl < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatNumber(row.pnl, 2)}
                          </td>
                        </tr>
                      ))}
                      {!data?.ticketSummary.bySymbol?.length && (
                        <tr>
                          <td colSpan={3} className="py-1 text-slate-500">
                            No trades in range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-400 mb-1">Top strategies</div>
                  <table className="w-full text-sm">
                    <tbody>
                      {data?.ticketSummary.byStrategy?.map((row) => (
                        <tr key={row.strategy}>
                          <td className="py-1 pr-3">{row.strategy}</td>
                          <td className="py-1 pr-3 text-right text-slate-400">{row.trades.toLocaleString()}</td>
                          <td className={`py-1 text-right font-mono ${row.pnl && row.pnl < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatNumber(row.pnl, 2)}
                          </td>
                        </tr>
                      ))}
                      {!data?.ticketSummary.byStrategy?.length && (
                        <tr>
                          <td colSpan={3} className="py-1 text-slate-500">
                            No strategies recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <strong>Ticket trend</strong>
            </CardHeader>
            <CardBody>
              {!hasTicketSeriesPoints && <p className="text-sm text-slate-400">No tickets for range.</p>}
              {hasTicketSeriesPoints && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400">
                        <th className="py-2 pr-3">Session</th>
                        <th className="py-2 pr-3">Trades</th>
                        <th className="py-2 pr-3">P/L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketSeriesPoints.map((point) => (
                        <tr key={point.bucket} className="border-t border-slate-800/40">
                          <td className="py-2 pr-3">{formatDateLabel(point.bucket, 'day')}</td>
                          <td className="py-2 pr-3">{point.trades.toLocaleString()}</td>
                          <td className={`py-2 pr-3 font-mono ${point.pnl && point.pnl < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatNumber(point.pnl, 2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase text-slate-400 tracking-wide">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
        {detail && <div className="text-xs text-slate-500">{detail}</div>}
      </CardBody>
    </Card>
  );
}
