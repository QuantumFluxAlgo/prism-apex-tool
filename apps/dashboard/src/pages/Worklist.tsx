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
import { RiskCell } from '../components/RiskCell';
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

/**
 * This is the “rich” Worklist row shape the original layout used.
 * TicketsPage also imports ActionableRow from here.
 */
export type ActionableRow = TicketRow & {
  rr?: number | null;
  actionable?: boolean | null;
  reason?: string | null;
};

/** Exported for tests / other tables that want to show operator sizing. */
export const OperatorSizingCell: React.FC<{ row: TicketRow }> = ({ row }) => {
  const qty = row?.operatorSizing?.qty ?? '—';
  return <span data-cell="OperatorSizingCell">{qty}</span>;
};

const deriveR = (row: ActionableRow) => {
  if (row.rr !== null && row.rr !== undefined && !Number.isNaN(row.rr)) return row.rr;
  const entry = row.entry_price;
  const stop = row.stop_price;
  const target = row.target_price;
  if (
    entry === null || entry === undefined ||
    stop === null || stop === undefined ||
    target === null || target === undefined
  ) return null;
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

const PAGE_SIZE = 20;

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

function resolveTickAndPnl(
  ticks: number | null | undefined,
  pnl: number | null | undefined,
): TickPnlDisplay | null {
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

/**
 * Rich PnL cells – exported for Tickets and tests.
 */
export const PnLDataCell: React.FC<{ row: ActionableRow; field: 'tick' | 'target' | 'stop' }> = ({
  row,
  field,
}) => {
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
    return <span className="text-sm font-medium text-gray-100">{formatCurrency(display.tickValueUSD)}</span>;
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
};

export const PnLRRCell: React.FC<{ row: ActionableRow }> = ({ row }) => {
  const stateMap = React.useContext(WorklistPnLContext);
  const { inputs, state } = useMemo(() => resolvePnlState(row, stateMap), [row, stateMap]);

  if (!hasCompleteInputs(inputs)) {
    return <span data-cell="PnLRRCell">{fmtR(deriveR(row))}</span>;
  }

  if (!state || state.status !== 'ready') {
    return <span data-cell="PnLRRCell">{fmtR(deriveR(row))}</span>;
  }

  const rr = state.data.rr;
  if (rr === null || rr === undefined || Number.isNaN(rr)) {
    return <span data-cell="PnLRRCell">{fmtR(deriveR(row))}</span>;
  }

  return <span data-cell="PnLRRCell">{fmtR(rr)}</span>;
};

/**
 * Worklist – actionable tickets across sessions.
 * Uses scope=actionable by default and keeps rows around until they’re no longer OPEN+actionable.
 */
const Worklist: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ActionableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  // Default: ALL symbols, ORR strategy, OPEN & actionable, LONGs only.
  const [filters, setFilters] = useState<Filters>({
    symbol: 'ALL',
    strategy: 'ALL',
    status: 'OPEN',
    showShorts: false,
  });

  const pnlState = usePnLState(rows);

  // Symbols
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

  const load = useCallback(
    async (withSpinner = false) => {
      if (withSpinner) {
        setLoading(true);
        setError(null);
      }

      try {
        const query = {
          limit: PAGE_SIZE,
          offset,
          // key bit: actionable scope unless we explicitly ask for COMPLETE
          scope: filters.status === 'COMPLETE' ? undefined : 'actionable',
          from: filters.from || undefined,
          to: filters.to || undefined,
          symbol: filters.symbol && filters.symbol !== 'ALL' ? filters.symbol : undefined,
          strategy: filters.strategy && filters.strategy !== 'ALL' ? filters.strategy : undefined,
          status: filters.status && filters.status !== 'ALL' ? filters.status : undefined,
          direction: filters.showShorts ? undefined : 'LONG',
        };

        const res = await fetchTickets(query);
        const rawRows = (res.rows ?? []) as ActionableRow[];
        const filteredRows = filters.showShorts
          ? rawRows
          : rawRows.filter((row) => (row.direction ?? 'LONG') === 'LONG');

        setRows(filteredRows);
        setTotal(typeof res.total === 'number' ? res.total : rawRows.length);
      } catch (err) {
        setRows([]);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (withSpinner) setLoading(false);
      }
    },
    [offset, filters.from, filters.to, filters.symbol, filters.strategy, filters.status, filters.showShorts],
  );

  useEffect(() => {
    void load(true);
  }, [load, refreshTick]);

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

  const handleComplete = useCallback(
    async (row: ActionableRow) => {
      const id = row.id ? String(row.id) : null;
      if (!id) {
        toast('Unable to complete ticket – missing id');
        return;
      }

      try {
        await completeTicket(id, { user: 'operator' });
        toast('Ticket marked complete.');
        setRefreshTick((t) => t + 1);
      } catch (err) {
        console.error('complete ticket failed', err);
        toast('Failed to complete ticket; please retry.');
      }
    },
    [toast],
  );

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
      render: (row) => fmtPrice(row.entry_price),
    },
    {
      key: 'stop_price',
      header: 'Stop',
      align: 'center',
      className: 'col-price text-center',
      render: (row) => (
        <span title={tooltipDist(row.symbol, row.entry_price ?? null, row.stop_price ?? null, 'Stop Δ')}>
          {fmtPrice(row.stop_price)}
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
          {fmtPrice(row.target_price)}
        </span>
      ),
    },
    {
      key: 'risk',
      header: 'Risk',
      align: 'center',
      className: 'col-risk text-center',
      render: (row) => <RiskCell row={row} />,
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
      key: 'operatorSizing',
      header: 'Size',
      align: 'center',
      className: 'col-operator-sizing text-center',
      render: (row) => <OperatorSizingCell row={row} />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      className: 'col-status text-center',
      render: (row) => (
        <div className="flex flex-col items-center gap-1">
          <Badge tone={row.status === 'COMPLETE' ? 'blue' : row.actionable ? 'green' : 'amber'}>
            {row.status ?? '—'}
          </Badge>
          {!row.actionable && row.reason ? <Badge tone="amber">{row.reason}</Badge> : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      className: 'col-actions text-center',
      render: (row) => {
        const disabled = !row.actionable || row.direction !== 'LONG' || row.status !== 'OPEN';
        const id = row.id ? String(row.id) : null;

        return (
          <div className="flex items-center justify-center gap-2">
            <CopyOcoButton row={row} disabled={!id} />
            <Button size="sm" disabled={disabled || !id} onClick={() => id && handleComplete(row)}>
              Complete
            </Button>
          </div>
        );
      },
    },
  ];

  const nextDisabled = offset + PAGE_SIZE >= total;

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
            extra={
              <SymbolCoverage
                rows={rows}
                className="hidden md:flex"
              />
            }
          />
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Tickets (open)" value={statusCounts.open} />
        <Kpi label="Tickets (complete)" value={statusCounts.complete} />
        <Kpi label="Page size" value={PAGE_SIZE} />
        <Kpi label="Total (all filters)" value={total} />
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      <Card>
        <CardBody>
          <WorklistPnLContext.Provider value={pnlState}>
            <DataTable
              className="tickets-table"
              columns={columns}
              rows={rows}
              loading={loading}
              emptyMessage="No actionable tickets match your filters."
              rowKey={(row, index) => (row.id ? String(row.id) : index)}
            />
          </WorklistPnLContext.Provider>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-400">
              Worklist shows actionable LONG tickets by default. Use filters to widen date range or include SHORTs.
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                Prev
              </Button>
              <Button size="sm" disabled={nextDisabled} onClick={() => setOffset(offset + PAGE_SIZE)}>
                Next
              </Button>
              <Button size="sm" onClick={() => setRefreshTick((t) => t + 1)}>
                Refresh
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default Worklist;
