import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import CopyOcoButton from '../components/CopyOcoButton';
import FiltersBar from '../ui/FiltersBar';
import Kpi from '../ui/Kpi';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Card, CardBody } from '../ui/Card';
import { fetchTickets, completeTicket, fetchSymbols, type TicketRow } from '../lib/api';
import { fmtUtc } from '../utils/time';
import { useToast } from '../context/ToastContext';
import { fmtPrice, fmtR, fmtPnlUSD } from '../utils/number';
import { tooltipPnL, tooltipDist } from '../utils/ticks';

type ActionableRow = TicketRow & {
  rr?: number | null;
  actionable?: boolean | null;
  reason?: string | null;
};

const deriveR = (row: ActionableRow) => {
  if (row.rr !== null && row.rr !== undefined && !Number.isNaN(row.rr)) return row.rr;
  const entry = row.entry_price;
  const stop = row.stop_price;
  const target = row.target_price;
  if (entry === null || entry === undefined || stop === null || stop === undefined || target === null || target === undefined) return null;
  if (entry === stop) return null;
  return Math.abs((target - entry) / (entry - stop));
};

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

const limit = 20;

export default function Worklist() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ActionableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    symbol: 'ALL',
    strategy: 'ALL',
    status: 'OPEN',
    showShorts: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchSymbols()
      .then((list) => {
        if (!cancelled && Array.isArray(list)) {
          setSymbols(list);
        }
      })
      .catch(() => {
        if (!cancelled) setSymbols([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = {
        limit,
        offset,
        scope: filters.status === 'COMPLETE' ? undefined : 'actionable',
        from: filters.from || undefined,
        to: filters.to || undefined,
        symbol: filters.symbol && filters.symbol !== 'ALL' ? filters.symbol : undefined,
        strategy: filters.strategy && filters.strategy !== 'ALL' ? filters.strategy : undefined,
        status: filters.status && filters.status !== 'ALL' ? filters.status : undefined,
        direction: filters.showShorts ? undefined : 'LONG',
      };

      const res = await fetchTickets(query);
      const rawRows = res.rows ?? [];
      const filteredRows = filters.showShorts
        ? rawRows
        : rawRows.filter((row) => (row.direction ?? 'LONG') === 'LONG');
      setRows(filteredRows);
      setTotal(typeof res.total === 'number' ? res.total : rawRows.length);
      return true;
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 5000;

    const tick = async () => {
      if (cancelled) return;
      const ok = await load();
      delay = ok ? 5000 : Math.min(60000, delay * 2);
      if (cancelled) return;
      timer = setTimeout(tick, delay);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  const symbolCount = useMemo(() => new Set(rows.map((row) => row.symbol)).size, [rows]);
  const actionableCount = useMemo(() => rows.filter((row) => row.actionable).length, [rows]);
  const shortCount = useMemo(() => rows.filter((row) => row.direction === 'SHORT').length, [rows]);
  const nextDisabled = offset + limit >= total;

  const columns: DataTableColumn<ActionableRow>[] = [
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
      render: (row) => fmtPrice(row.entry_price ?? undefined),
    },
    {
      key: 'stop_price',
      header: 'Stop',
      align: 'right',
      render: (row) => (
      <span title={tooltipDist(row.symbol, row.entry_price ?? null, row.stop_price ?? null, 'Stop Δ')}>
        {fmtPrice(row.stop_price ?? undefined)}
      </span>
    ),
    },
    {
      key: 'target_price',
      header: 'Target',
      align: 'right',
      render: (row) => (
      <span title={tooltipDist(row.symbol, row.entry_price ?? null, row.target_price ?? null, 'Target Δ')}>
        {fmtPrice(row.target_price ?? undefined)}
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
      key: 'reason',
      header: 'Warning',
      render: (row) => (row.reason ? <Badge tone="amber">{row.reason}</Badge> : '—'),
    },
    {
      key: 'action',
      header: '',
      className: 'text-right',
      render: (row) => (
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
            disabled={!row.actionable || row.direction !== 'LONG' || row.status !== 'OPEN'}
            onClick={async () => {
              if (!row.id) return;
              try {
                const updated = await completeTicket(String(row.id), { user: 'operator', note: 'worklist' });
                toast('Ticket marked complete');
                setRows((prev) => prev.filter((entry) => entry.id !== updated.id));
                setTotal((prev) => Math.max(0, prev - 1));
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
              }
            }}
          >
            Mark Complete
          </Button>
        </div>
      ),
    },
  ];

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
                value: filters.status ?? 'OPEN',
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
          >
            <Button size="sm" variant="ghost" onClick={() => void load()}>
              Refresh
            </Button>
          </FiltersBar>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Open Actionable" value={actionableCount} />
        <Kpi label="Visible Tickets" value={rows.length} />
        <Kpi label="Symbols" value={symbolCount} />
        <Kpi label="Shorts (view-only)" value={shortCount} />
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      <Card>
        <CardBody>
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            emptyMessage="No actionable tickets at the moment."
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
