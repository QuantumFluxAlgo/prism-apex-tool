import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Kpi from '../ui/Kpi';
import { Card, CardBody } from '../ui/Card';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import FiltersBar from '../ui/FiltersBar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { fmtUtc } from '../utils/time';
import { fmtPrice } from '../utils/number';
import { tooltipDist } from '../utils/ticks';
import { fetchSymbols, fetchTickets, recordOperatorAction, type TicketRow } from '../lib/api';
import { WorklistPnLContext, usePnLState } from '../hooks/usePnLState';
import { PnLDataCell, PnLRRCell, type ActionableRow } from './Worklist';
import { RiskCell } from '../components/RiskCell';
import { useToast } from '../context/ToastContext';
import { TicketQualityFilterBar } from '../components/tickets/TicketQualityFilterBar';
import type { TicketQualityFilterState } from '../types/ticketQualityFilters';
import { buildTicketQualityQuery } from '../utils/ticketQualityQuery';

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

export default function TicketsPage() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;
  const [offset, setOffset] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>({
    symbol: 'ALL',
    strategy: 'ALL',
    status: 'ALL',
    showShorts: false,
  });
  const [qualityFilters, setQualityFilters] = useState<TicketQualityFilterState>({});
  const [appliedQualityFilters, setAppliedQualityFilters] = useState<TicketQualityFilterState>({});
  const appliedQualityQuery = useMemo(
    () => buildTicketQualityQuery(appliedQualityFilters),
    [appliedQualityFilters],
  );

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
      direction: filters.showShorts ? undefined : 'LONG',
      ...appliedQualityQuery,
    };

    fetchTickets(query)
      .then((response) => {
        if (cancelled) return;
        const rawRows = response.rows ?? [];
        const filteredRows = filters.showShorts ? rawRows : rawRows.filter((row) => (row.direction ?? 'LONG') === 'LONG');
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
  }, [
    limit,
    offset,
    filters.from,
    filters.to,
    filters.symbol,
    filters.strategy,
    filters.status,
    filters.showShorts,
    refreshTick,
    appliedQualityQuery,
  ]);

  const handleOperatorAction = useCallback(
    async (row: TicketRow) => {
      const ticketId = row.id ? String(row.id) : null;
      if (!ticketId) {
        toast('Operator action failed; missing ticket id.');
        return;
      }
      setPendingActions((prev) => ({ ...prev, [ticketId]: true }));
      try {
        await recordOperatorAction(ticketId, 'ACTIONED');
        toast('Operator action recorded.');
        setRefreshTick((prev) => prev + 1);
      } catch (err) {
        console.error('operator action failed', err);
        toast('Operator action failed; please retry.');
      } finally {
        setPendingActions((prev) => {
          const next = { ...prev };
          delete next[ticketId];
          return next;
        });
      }
    },
    [toast],
  );

  const pnlState = usePnLState(rows);

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
      key: 'rr',
      header: 'R:R',
      align: 'center',
      className: 'col-narrow text-center',
      render: (row) => <PnLRRCell row={row as ActionableRow} />, 
    },
    {
      key: 'pnlTickValue',
      header: 'Tick $',
      align: 'center',
      className: 'col-narrow text-center',
      render: (row) => <PnLDataCell row={row as ActionableRow} field="tick" />, 
    },
    {
      key: 'pnlTarget',
      header: 'Target (t/$)',
      align: 'center',
      className: 'col-narrow text-center',
      render: (row) => <PnLDataCell row={row as ActionableRow} field="target" />, 
    },
    {
      key: 'pnlStop',
      header: 'Stop (t/$)',
      align: 'center',
      className: 'col-narrow text-center',
      render: (row) => <PnLDataCell row={row as ActionableRow} field="stop" />, 
    },
    {
      key: 'riskDecision',
      header: 'Risk',
      align: 'center',
      className: 'col-risk text-center',
      render: (row) => <RiskCell row={row} />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      className: 'col-status text-center',
      render: (row) => (
        <div className="flex flex-col items-center gap-1">
          <Badge tone={row.status === 'COMPLETE' ? 'blue' : row.actionable ? 'green' : 'amber'}>{row.status ?? '—'}</Badge>
          {!row.actionable && row.reason ? (
            <Badge tone="amber">{row.reason}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'operator',
      header: 'Operator',
      align: 'center',
      className: 'col-operator text-center',
      render: (row) => {
        const ticketId = row.id ? String(row.id) : null;
        const pending = ticketId ? Boolean(pendingActions[ticketId]) : false;
        return (
          <Button
            size="sm"
            disabled={!ticketId || pending}
            onClick={() => ticketId && handleOperatorAction(row)}
          >
            {pending ? 'Saving…' : 'Actioned'}
          </Button>
        );
      },
    },
  ];

  const nextDisabled = offset + limit >= total;

  const handleApplyQualityFilters = useCallback((nextFilters: TicketQualityFilterState) => {
    setQualityFilters(nextFilters);
    setAppliedQualityFilters(nextFilters);
    setOffset(0);
  }, []);

  const handleClearQualityFilters = useCallback(() => {
    setQualityFilters({});
    setAppliedQualityFilters({});
    setOffset(0);
  }, []);

  return (
    <div className="dashboard-stack">
      <Card>
        <CardBody className="dashboard-card__body stack">
          <TicketQualityFilterBar
            value={qualityFilters}
            onChange={setQualityFilters}
            onApply={handleApplyQualityFilters}
            onClear={handleClearQualityFilters}
          />
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
          <WorklistPnLContext.Provider value={pnlState}>
            <DataTable
              className="tickets-table"
              columns={columns}
              rows={rows}
              loading={loading}
              emptyMessage="No tickets match your filters."
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
