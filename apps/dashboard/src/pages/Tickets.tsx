import React, { useEffect, useMemo, useState } from 'react';
import Kpi from '../ui/Kpi';
import { Card, CardBody } from '../ui/Card';
import DataTable from '../ui/DataTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { fetchSymbols, fetchTickets, type TicketRow } from '../lib/api';
import { fmtUtc, num } from '../utils/time';

type Filters = {
  from?: string;
  to?: string;
  symbol: string;
  strategy: string;
  status: string;
  page: number;
  pageSize: number;
};

const deriveStatus = (row: TicketRow): 'OPEN' | 'CLOSED' | 'COMPLETE' => {
  if (row.status === 'COMPLETE') return 'COMPLETE';
  if (row.status === 'OPEN') return 'OPEN';
  if (row.status === 'CLOSED') return 'CLOSED';
  return row.closed_at_utc ? 'CLOSED' : 'OPEN';
};

export default function TicketsPage() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    symbol: 'ALL',
    strategy: 'ALL',
    status: 'ANY',
    page: 1,
    pageSize: 25,
  });
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSymbols()
      .then((list) => {
        if (!cancelled) setSymbols(list);
      })
      .catch(() => {
        if (!cancelled) setSymbols([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const offset = useMemo(() => (filters.page - 1) * filters.pageSize, [filters.page, filters.pageSize]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchTickets({
          from: filters.from ? new Date(filters.from).toISOString() : undefined,
          to: filters.to ? new Date(filters.to).toISOString() : undefined,
          symbol: filters.symbol,
          strategy: filters.strategy,
          status: filters.status,
          limit: filters.pageSize,
          offset,
        });

        if (cancelled) return;
        setRows(response.rows ?? []);
        setTotal(typeof response.total === 'number' ? response.total : response.rows?.length ?? 0);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setRows([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : 'Failed to load tickets');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
  }, [filters.symbol, filters.strategy, filters.status, filters.from, filters.to, filters.page, filters.pageSize, offset]);

  const { open, closed, complete } = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const status = deriveStatus(row);
        if (status === 'OPEN') acc.open += 1;
        else if (status === 'CLOSED') acc.closed += 1;
        else if (status === 'COMPLETE') acc.complete += 1;
        return acc;
      },
      { open: 0, closed: 0, complete: 0 },
    );
  }, [rows]);

  const nextDisabled = offset + rows.length >= total || rows.length === 0;

  return (
    <div className="space-y-4">
      {/* Filters bar (wired locally for now) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-3 dark:border-zinc-800">
        <span className="text-xs text-gray-500">UTC (GMT)</span>
        <input
          type="date"
          value={filters.from ?? ''}
          onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value || undefined, page: 1 }))}
          className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          type="date"
          value={filters.to ?? ''}
          onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value || undefined, page: 1 }))}
          className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          value={filters.symbol}
          onChange={(event) => setFilters((prev) => ({ ...prev, symbol: event.target.value, page: 1 }))}
          className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="ALL">All Symbols</option>
          {symbols.map((symbol) => (
            <option key={symbol} value={symbol}>
              {symbol}
            </option>
          ))}
        </select>
        <select
          value={filters.strategy}
          onChange={(event) => setFilters((prev) => ({ ...prev, strategy: event.target.value, page: 1 }))}
          className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="ALL">All Strategies</option>
          <option value="ORR">ORR</option>
        </select>
        <select
          value={filters.status}
          onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value, page: 1 }))}
          className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="ANY">Any Status</option>
          <option value="OPEN">OPEN</option>
          <option value="CLOSED">CLOSED</option>
          <option value="COMPLETE">COMPLETE</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Total tickets (page)" value={rows.length} />
        <Kpi label="Open" value={open} />
        <Kpi label="Closed" value={closed} />
        <Kpi label="Complete" value={complete} />
        <Kpi label="Total (all)" value={total} />
      </div>

      {/* Table */}
      <Card>
        <CardBody>
          <DataTable
            headers={
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Strategy</th>
                <th className="px-3 py-2">Dir</th>
                <th className="px-3 py-2">Opened (UTC / GMT)</th>
                <th className="px-3 py-2">Closed</th>
                <th className="px-3 py-2">Entry</th>
                <th className="px-3 py-2">Exit</th>
                <th className="px-3 py-2">PnL</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            }
          >
            {loading ? (
              <tr>
                <td className="px-3 py-3" colSpan={10}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-3" colSpan={10}>
                  {error ?? 'No tickets'}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const status = deriveStatus(row);
                const statusTone = status === 'OPEN' ? 'blue' : status === 'COMPLETE' ? 'green' : 'yellow';

                return (
                  <tr key={row.id ?? `${row.symbol}-${row.opened_at_utc ?? index}`}> 
                    <td className="px-3 py-2">{row.symbol}</td>
                    <td className="px-3 py-2">{row.strategy}</td>
                    <td className="px-3 py-2">{row.direction}</td>
                    <td className="px-3 py-2">{fmtUtc(row.opened_at_utc)}</td>
                    <td className="px-3 py-2">{fmtUtc(row.closed_at_utc)}</td>
                    <td className="px-3 py-2">{num(row.entry_price)}</td>
                    <td className="px-3 py-2">{num(row.exit_price)}</td>
                    <td className="px-3 py-2">{num(row.pnl)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={statusTone}>{status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Button disabled>Mark Complete</Button>
                    </td>
                  </tr>
                );
              })
            )}
          </DataTable>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Page {filters.page} · {filters.pageSize} per page · {total} total
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-zinc-800"
                disabled={filters.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              >
                Prev
              </button>
              <button
                type="button"
                className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-zinc-800"
                disabled={nextDisabled}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </button>
              <select
                value={filters.pageSize}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, pageSize: Number(event.target.value), page: 1 }))
                }
                className="rounded border border-gray-200 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
