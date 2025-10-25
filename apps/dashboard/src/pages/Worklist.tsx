import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import CopyOcoButton from '../components/CopyOcoButton';
import FiltersBar from '../ui/FiltersBar';
import Kpi from '../ui/Kpi';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Card, CardBody } from '../ui/Card';
import { fetchTickets, completeTicket, fetchSymbols, type TicketRow } from '../lib/api';
import { SymbolCoverage } from '../components/SymbolCoverage';
import { fmtUtc } from '../utils/time';
import { useToast } from '../context/ToastContext';
import { fmtPrice, fmtR } from '../utils/number';
import { tooltipDist } from '../utils/ticks';
import { Tooltip } from '../ui/Tooltip';
import {
  WorklistPnLContext,
  hasCompleteInputs,
  usePnLState,
  derivePnLInputs,
  type PnlCellState,
} from '../hooks/usePnLState';

export type ActionableRow = TicketRow & {
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

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return USD.format(value);
}

type TickPnlDisplay = { tickText: string; usdText: string };

function resolveTickAndPnl(ticks: number | null | undefined, pnl: number | null | undefined): TickPnlDisplay | null {
  if (ticks === null || ticks === undefined || pnl === null || pnl === undefined) return null;
  const signedTicks = Math.sign(pnl || 0) === 0 ? ticks : Math.sign(pnl) * Math.abs(ticks);
  if (!Number.isFinite(signedTicks)) return null;
  const usdText = formatCurrency(pnl);
  if (usdText === '—') return null;
  return {
    tickText: signedTicks.toString(),
    usdText,
  };
}

function resolvePnlState(row: ActionableRow, map: Record<string, PnlCellState>) {
  const inputs = derivePnLInputs(row as Record<string, any>);
  return { inputs, state: map[inputs.key] } as const;
}

export function PnLDataCell({ row, field }: { row: ActionableRow; field: 'tick' | 'target' | 'stop' }) {
  const stateMap = React.useContext(WorklistPnLContext);
  const { inputs, state } = React.useMemo(() => resolvePnlState(row, stateMap), [row, stateMap]);

  if (!hasCompleteInputs(inputs)) {
    return (
      <Tooltip text="Entry, Stop, and Target required">
        <span className="text-xs text-gray-400">—</span>
      </Tooltip>
    );
  }

  if (!state || state.status === 'loading') {
    return <span className="text-xs text-gray-400">loading…</span>;
  }

  if (state.status === 'invalid') {
    return (
      <Tooltip text="Entry, Stop, and Target required">
        <span className="text-xs text-gray-400">—</span>
      </Tooltip>
    );
  }

  if (state.status === 'pending') {
    if (field !== 'tick') {
      return (
        <Tooltip text={state.reason ?? 'Tick spec pending verification'}>
          <span className="text-xs text-gray-400">—</span>
        </Tooltip>
      );
    }
    return (
      <Tooltip text={state.reason ?? 'Tick spec pending verification'}>
        <Badge tone="amber">Spec pending</Badge>
      </Tooltip>
    );
  }

  if (state.status === 'error') {
    if (field !== 'tick') {
      return (
        <Tooltip text={state.reason ?? 'Unable to compute PnL'}>
          <span className="text-xs text-gray-400">—</span>
        </Tooltip>
      );
    }
    return (
      <Tooltip text={state.reason ?? 'Unable to compute PnL'}>
        <Badge tone="red">Error</Badge>
      </Tooltip>
    );
  }

  const display = state.data;

  if (field === 'tick') {
    return <span className="text-sm font-medium text-gray-900">{formatCurrency(display.tickValueUSD)}</span>;
  }

  if (field === 'target') {
    const resolved = resolveTickAndPnl(display.ticksToTarget, display.pnlTargetUSD);
    if (!resolved) {
      return <span className="text-xs text-gray-400">—</span>;
    }
    return (
      <div
        className="worklist-pnl worklist-pnl--positive"
        title={`${resolved.tickText} ticks = ${resolved.usdText}`}
      >
        <span className="worklist-pnl__ticks">{resolved.tickText}</span>
        <span className="worklist-pnl__usd">{resolved.usdText}</span>
      </div>
    );
  }

  const resolved = resolveTickAndPnl(display.ticksToStop, display.pnlStopUSD);
  if (!resolved) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  return (
    <div
      className="worklist-pnl worklist-pnl--negative"
      title={`${resolved.tickText} ticks = ${resolved.usdText}`}
    >
      <span className="worklist-pnl__ticks">{resolved.tickText}</span>
      <span className="worklist-pnl__usd">{resolved.usdText}</span>
    </div>
  );
}

export function PnLRRCell({ row }: { row: ActionableRow }) {
  const stateMap = React.useContext(WorklistPnLContext);
  const { inputs, state } = React.useMemo(() => resolvePnlState(row, stateMap), [row, stateMap]);

  if (!hasCompleteInputs(inputs)) {
    return fmtR(deriveR(row));
  }

  if (!state || state.status !== 'ready') {
    return fmtR(deriveR(row));
  }

  const rr = state.data.rr;
  if (rr === null || rr === undefined || Number.isNaN(rr)) {
    return fmtR(deriveR(row));
  }

  return fmtR(rr);
}

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
  const pnlState = usePnLState(rows);

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

  const load = useCallback(async (withSpinner = false) => {
    if (withSpinner) {
      setLoading(true);
      setError(null);
    }
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
      setError(null);
      return true;
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      if (withSpinner) setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 5000;

    const run = async (withSpinner: boolean) => {
      if (cancelled) return;
      const ok = await load(withSpinner);
      delay = ok ? 5000 : Math.min(60000, delay * 2);
      if (cancelled) return;
      timer = setTimeout(() => run(false), delay);
    };

    void run(true);

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
    header: 'Opened',
    align: 'center',
    className: 'col-opened text-center',
    render: (row) => fmtUtc(row.opened_at_utc),
  },
  {
    key: 'direction',
    header: 'Dir',
    align: 'center',
    className: 'col-dir text-center',
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
    align: 'center',
    className: 'col-symbol text-center',
    render: (row) => <Badge tone="blue">{row.symbol}</Badge>,
  },
  {
    key: 'strategy',
    header: 'Strat',
    align: 'center',
    className: 'col-strategy text-center',
    render: (row) => row.strategy,
  },
  {
    key: 'entry_price',
    header: 'Entry',
    align: 'center',
    className: 'col-price text-center',
    render: (row) => fmtPrice(row.entry_price ?? undefined),
  },
  {
    key: 'stop_price',
    header: 'Stop',
    align: 'center',
    className: 'col-price text-center',
    render: (row) => (
      <span title={tooltipDist(row.symbol, row.entry_price ?? null, row.stop_price ?? null, 'Stop Δ')}>
        {fmtPrice(row.stop_price ?? undefined)}
      </span>
    ),
  },
  {
    key: 'target_price',
    header: 'Target',
    align: 'center',
    className: 'col-price text-center',
    render: (row) => (
      <span title={tooltipDist(row.symbol, row.entry_price ?? null, row.target_price ?? null, 'Target Δ')}>
        {fmtPrice(row.target_price ?? undefined)}
      </span>
    ),
  },
  {
    key: 'rr',
    header: 'R:R',
    align: 'center',
    className: 'col-narrow text-center',
    render: (row) => <PnLRRCell row={row} />, 
  },
  {
    key: 'pnlTickValue',
    header: 'Tick $',
    align: 'center',
    className: 'col-narrow text-center',
    render: (row) => <PnLDataCell row={row} field="tick" />, 
  },
  {
    key: 'pnlTarget',
    header: 'Target (t/$)',
    align: 'center',
    className: 'col-narrow text-center',
    render: (row) => <PnLDataCell row={row} field="target" />, 
  },
  {
    key: 'pnlStop',
    header: 'Stop (t/$)',
    align: 'center',
    className: 'col-narrow text-center',
    render: (row) => <PnLDataCell row={row} field="stop" />, 
  },
  {
    key: 'reason',
    header: 'Warning',
    align: 'center',
    className: 'col-wide text-center',
    render: (row) => (row.reason ? <Badge tone="amber">{row.reason}</Badge> : '—'),
  },
  {
    key: 'action',
    header: '',
    className: 'col-actions text-right',
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
      <div className="mb-3">
        <SymbolCoverage />
      </div>
      <div
        data-testid="pnl-beta-banner"
        style={{
          marginBottom: 8,
          opacity: 0.85,
        }}
      >
        <span
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: '#1e293b',
            color: '#93c5fd',
            fontSize: 12,
          }}
        >
          PnL Beta Active — tick-based per-contract
        </span>
      </div>
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
            <Button size="sm" variant="ghost" onClick={() => void load(true)} disabled={loading}>
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
          <WorklistPnLContext.Provider value={pnlState}>
            <DataTable
              className="worklist-table"
              columns={columns}
              rows={rows}
              loading={loading}
              emptyMessage="No actionable tickets at the moment."
              rowKey={(row, index) => (row.id ? String(row.id) : index)}
            />
          </WorklistPnLContext.Provider>
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
