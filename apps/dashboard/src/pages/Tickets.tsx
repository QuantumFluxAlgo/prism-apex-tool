import React, { useEffect, useMemo, useState } from 'react';
import Kpi from '../ui/Kpi';
import CopyOcoButton from '../components/CopyOcoButton';
import { Card, CardBody } from '../ui/Card';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import FiltersBar from '../ui/FiltersBar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { fmtUtc } from '../utils/time';
import { fmtPrice, fmtR, fmtPnlUSD } from '../utils/number';
import { tooltipPnL, tooltipDist } from '../utils/ticks';
import { fetchSymbols, fetchTickets, completeTicket, type TicketRow } from '../lib/api';
import { useToast } from '../context/ToastContext';

type Filters = {
  from?: string;
  to?: string;
  symbol?: string;
  strategy?: string;
  status?: string;
  showShorts?: boolean;
};

const DEFAULT_SYMBOL_OPTIONS = [
  'ALL',
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

const deriveR = (row: TicketRow) => {
  if (row.rr !== null && row.rr !== undefined && !Number.isNaN(row.rr)) return row.rr;
  const entry = row.entry_price;
  const stop = row.stop_price;
  const target = row.target_price;
  if (entry === null || entry === undefined || stop === null || stop === undefined || target === null || target === undefined) return null;
  if (entry === stop) return null;
  return Math.abs((target - entry) / (entry - stop));
};

export default function TicketsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;
  const [offset, setOffset] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    symbol: 'ALL',
    strategy: 'ALL',
    status: 'ALL',
    showShorts: false,
  });

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const query = {
      limit,
      offset,
      from: filters.from || undefined,
      to: filters.to || undefined,
      symbol: filters.symbol && filters.symbol !== 'ALL' ? filters.symbol : undefined,
      strategy: filters.strategy && filters.strategy !== 'ALL' ? filters.strategy : undefined,
      status: filters.status && filters.status !== 'ALL' ? filters.status : undefined,
    };

    fetchTickets(query)
      .then((response) => {
        if (cancelled) return;
        const rawRows = response.rows ?? [];
        const filteredRows = filters.showShorts ? rawRows : rawRows.filter((row) => row.direction === 'LONG');
        setRows(filteredRows);
        setTotal(typeof response.total === 'number' ? response.total : rawRows.length);
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [limit, offset, filters.from, filters.to, filters.symbol, filters.strategy, filters.status, filters.showShorts]);

  const statusCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        if (row.status === 'OPEN') acc.open += 1;
        if (row.status === 'COMPLETE') acc.complete += 1;
        return acc;
      },
      { open: 0, complete: 0 },
    );
  }, [rows]);

  const columns: DataTableColumn<TicketRow>[] = [
    {
      key: 'opened_at_utc',
      header: 'Opened (UTC/GMT)',
      render: (row) => fmtUtc(row.opened_at_utc),
    },
    {
      key: 'direction',
      header: 'Dir',
      render: (row) => (
        <Badge
          tone={row.direction === 'LONG' ? 'green' : 'gray'}
          title={row.direction === 'LONG' ? 'Long (actionable)' : 'Short (view only)'}
        >
          {row.direction}
        </Badge>
      ),
    },
    {
      key: 'symbol',
      header: 'Symbol',
      render: (row) => <Badge tone="blue">{row.symbol}</Badge>,
    },
    {
      key: 'strategy',
      header: 'Strat',
      render: (row) => row.strategy,
    },
    {
      key: 'entry_price',
      header: 'Entry',
      align: 'right',
      render: (row) => fmtPrice(row.entry_price),
    },
    {
      key: 'stop_price',
      header: 'Stop',
      align: 'right',
      render: (row) => (
        <span title={tooltipDist(row.symbol, row.entry_price ?? null, row.stop_price ?? null, 'Stop Δ')}>
          {fmtPrice(row.stop_price)}
        </span>
      ),
    },
    {
      key: 'target_price',
      header: 'Target',
      align: 'right',
      render: (row) => (
        <span title={tooltipDist(row.symbol, row.entry_price ?? null, row.target_price ?? null, 'Target Δ')}>
          {fmtPrice(row.target_price)}
        </span>
      ),
    },
    {
      key: 'rr',
      header: 'R:R',
      align: 'right',
      render: (row) => fmtR(deriveR(row)),
    },
    {
      key: 'pnl',
      header: 'PnL',
      align: 'right',
      render: (row) => {
        const pnl = row.pnl ?? null;
        const tone = pnl === null ? 'neutral' : pnl > 0 ? 'green' : pnl < 0 ? 'red' : 'neutral';
        return (
          <Badge tone={tone} title={tooltipPnL(row.symbol, row.entry_price ?? null, row.exit_price ?? null)}>
            {fmtPnlUSD(pnl)}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <Badge tone={row.status === 'COMPLETE' ? 'blue' : row.actionable ? 'green' : 'amber'}>{row.status ?? '—'}</Badge>
          {!row.actionable && row.reason ? (
            <Badge tone="amber">{row.reason}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => {
        const id = row.id ? String(row.id) : undefined;
        const disabled = !id || row.direction !== 'LONG' || row.status !== 'OPEN' || !row.actionable || busyId === id;
        return (
          <div className="flex justify-end gap-2">
            <CopyOcoButton
              symbol={row.symbol}
              direction={row.direction as 'LONG' | 'SHORT'}
              entry={row.entry_price}
              stop={row.stop_price}
              target={row.target_price}
              rr={deriveR(row) ?? undefined}
              disabled={row.direction !== 'LONG'}
            />
            <Button
              size="sm"
              variant="primary"
              title={row.direction === 'SHORT' ? 'Short tickets are view-only right now' : 'Mark as complete'}
              disabled={disabled}
              onClick={async () => {
                if (!id) return;
                try {
                  setBusyId(id);
                  const updated = await completeTicket(id, { user: 'operator' });
                  toast('Ticket marked complete');
                  setRows((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry)));
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                } finally {
                  setBusyId(null);
                }
              }}
            >
              Mark complete
            </Button>
          </div>
        );
      },
    },
  ];

  const nextDisabled = rows.length < limit;

  return (
    <div className="dashboard-stack">
      <Card>
        <CardBody className="dashboard-card__body stack">
          <FiltersBar
            dateRange={{
              from: filters.from,
              to: filters.to,
              onChange: (from, to) => {
                setOffset(0);
                setFilters((prev) => ({ ...prev, from, to }));
              },
            }}
            selects={[
              {
                label: 'Symbol',
                value: filters.symbol ?? 'ALL',
                options: ['ALL', ...(symbols.length ? symbols : DEFAULT_SYMBOL_OPTIONS.slice(1))],
                onChange: (value) => {
                  setOffset(0);
                  setFilters((prev) => ({ ...prev, symbol: value }));
                },
              },
              {
                label: 'Strategy',
                value: filters.strategy ?? 'ALL',
                options: ['ALL', 'ORR'],
                onChange: (value) => {
                  setOffset(0);
                  setFilters((prev) => ({ ...prev, strategy: value }));
                },
              },
              {
                label: 'Status',
                value: filters.status ?? 'ALL',
                options: ['ALL', 'OPEN', 'COMPLETE'],
                onChange: (value) => {
                  setOffset(0);
                  setFilters((prev) => ({ ...prev, status: value }));
                },
              },
            ]}
            toggles={[
              {
                label: 'Show SHORTs (view-only)',
                checked: Boolean(filters.showShorts),
                onChange: (checked) => {
                  setOffset(0);
                  setFilters((prev) => ({ ...prev, showShorts: checked }));
                },
              },
            ]}
          />
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Tickets (open)" value={statusCounts.open} />
        <Kpi label="Tickets (complete)" value={statusCounts.complete} />
        <Kpi label="Page size" value={limit} />
        <Kpi label="Total (all filters)" value={total} />
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      <Card>
        <CardBody>
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            emptyMessage="No tickets match your filters."
            rowKey={(row, index) => (row.id ? String(row.id) : index)}
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-400">
              Entry/Stop/Target and R are ORR-derived. SHORTs are visible but not actionable.
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                Prev
              </Button>
              <Button size="sm" disabled={nextDisabled} onClick={() => setOffset(offset + limit)}>
                Next
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
