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
import { saveAs } from '../utils/export';

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

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function mergeCanonicalFields(row: TicketRow): TicketRow {
  if (!row.canonicalApproved) return row;
  const canonical = row.canonicalApproved;
  return {
    ...row,
    id: canonical.ticketId,
    symbol: canonical.symbol,
    strategy: canonical.strategyId,
    direction: canonical.side,
    entryPrice: canonical.entryPrice,
    stopPrice: canonical.stopPrice,
    targetPrice: canonical.targetPrice,
    entry_price: canonical.entryPrice,
    stop_price: canonical.stopPrice,
    target_price: canonical.targetPrice,
    qty: canonical.quantity,
    quantity: canonical.quantity,
    contracts: canonical.quantity,
    rrMultiple: canonical.rrMultiple,
    rr: canonical.rrMultiple,
    riskDollars: canonical.totalRisk,
    rewardDollars: canonical.expectedReward,
    pnl: canonical.pnl ?? row.pnl ?? null,
    pnlAmount: canonical.pnl ?? row.pnlAmount ?? null,
    pnlRatio: canonical.pnlRMultiple ?? row.pnlRatio ?? null,
    session_date_utc: canonical.sessionDateUtc,
    opened_at_utc: canonical.createdAtUtc,
    completed_at_utc: canonical.finalizedAtUtc ?? row.completed_at_utc ?? null,
    completed_by: row.completed_by ?? null,
    tags: canonical.tags ?? row.tags,
    contextRegime: canonical.contextRegime ?? row.contextRegime,
    contextAtrBucket: canonical.contextAtrBucket ?? row.contextAtrBucket,
    contextOrType: canonical.contextOrType ?? row.contextOrType,
    status: (canonical.status as TicketRow['status']) ?? row.status,
  } satisfies TicketRow;
}

function mergeCanonicalFields(row: TicketRow): TicketRow {
  const canonical = row.canonicalApproved;
  if (!canonical) {
    return row;
  }

  const entry = canonical.entryPrice;
  const stop = canonical.stopPrice;
  const target = canonical.targetPrice;

  return {
    ...row,
    id: canonical.ticketId,
    symbol: canonical.symbol,
    strategy: canonical.strategyId,
    side: canonical.side,
    direction: canonical.side,
    session_date_utc: canonical.sessionDateUtc,
    opened_at_utc: canonical.createdAtUtc,
    completed_at_utc: canonical.finalizedAtUtc ?? row.completed_at_utc ?? null,
    entryPrice: entry,
    stopPrice: stop,
    targetPrice: target,
    entry_price: entry,
    stop_price: stop,
    target_price: target,
    qty: canonical.quantity,
    quantity: canonical.quantity,
    contracts: canonical.quantity,
    rr: canonical.rrMultiple,
    rrMultiple: canonical.rrMultiple,
    riskDollars: canonical.totalRisk,
    rewardDollars: canonical.expectedReward,
    pnl: canonical.pnl ?? row.pnl ?? null,
    pnlAmount: canonical.pnl ?? row.pnlAmount ?? null,
    pnlRatio: canonical.pnlRMultiple ?? row.pnlRatio ?? null,
    tags: canonical.tags ?? row.tags,
    contextRegime: canonical.contextRegime ?? row.contextRegime,
    contextAtrBucket: canonical.contextAtrBucket ?? row.contextAtrBucket,
    contextOrType: canonical.contextOrType ?? row.contextOrType,
    status: (canonical.status as TicketRow['status']) ?? row.status,
  } satisfies TicketRow;
}

function buildExportRecord(row: TicketRow) {
  const canonical = row.canonicalApproved;
  const entry = canonical?.entryPrice ?? row.entry_price ?? row.entryPrice ?? null;
  const stop = canonical?.stopPrice ?? row.stop_price ?? row.stopPrice ?? null;
  const target = canonical?.targetPrice ?? row.target_price ?? row.targetPrice ?? null;
  const qty = canonical?.quantity ?? row.qty ?? row.quantity ?? 0;
  const perRisk = canonical?.perContractRisk ?? (entry !== null && stop !== null ? Math.abs(entry - stop) : null);
  const totalRisk = canonical?.totalRisk ?? (perRisk !== null ? perRisk * Math.max(qty, 1) : null);
  const expectedReward = canonical?.expectedReward ?? (entry !== null && target !== null ? Math.abs(target - entry) : null);

  return {
    ticketId: canonical?.ticketId ?? row.id ?? '',
    symbol: canonical?.symbol ?? row.symbol,
    strategy: canonical?.strategyId ?? row.strategy,
    side: canonical?.side ?? row.side,
    entryPrice: entry,
    stopPrice: stop,
    targetPrice: target,
    quantity: qty,
    perContractRiskUSD: perRisk,
    totalRiskUSD: totalRisk,
    expectedRewardUSD: expectedReward,
    rrMultiple: canonical?.rrMultiple ?? row.rrMultiple ?? row.rr ?? null,
    status: canonical?.status ?? row.status,
    openedAtUtc: row.opened_at_utc ?? row.createdAtUtc ?? null,
    completedAtUtc: canonical?.finalizedAtUtc ?? row.completed_at_utc ?? null,
    tags: (canonical?.tags ?? row.tags ?? []).join(' '),
    reasons: (row.reasons ?? []).join(' | '),
  };
}

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

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
  const [selectedDetail, setSelectedDetail] = useState<TicketRow | null>(null);
  const [exporting, setExporting] = useState(false);
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
        const normalizedRows = filteredRows.map(mergeCanonicalFields);
        setRows(normalizedRows);
        setTotal(typeof response.total === 'number' ? response.total : rawRows.length);
        if (normalizedRows.length) {
          setSelectedDetail((prev) => {
            if (prev) {
              const match = normalizedRows.find((row) => row.id === prev.id);
              return match ?? normalizedRows[0];
            }
            return normalizedRows[0];
          });
        } else {
          setSelectedDetail(null);
        }
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
    selectedDetail,
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
    {
      key: 'inspect',
      header: 'Inspect',
      align: 'center',
      className: 'col-actions text-center',
      render: (row) => (
        <Button size="sm" variant={selectedDetail?.id === row.id ? 'default' : 'ghost'} onClick={() => setSelectedDetail(row)}>
          Details
        </Button>
      ),
    },
  ];

  const handleExport = useCallback(() => {
    if (!rows.length || exporting) return;
    setExporting(true);
    try {
      const records = rows.map(buildExportRecord);
      if (!records.length) return;
      const headers = Object.keys(records[0]);
      const lines = [headers.join(',')];
      for (const record of records) {
        lines.push(headers.map((key) => toCsvValue((record as Record<string, unknown>)[key])).join(','));
      }
      const timestamp = new Date().toISOString().replace(/[:]/g, '-');
      saveAs(`tickets-${timestamp}.csv`, lines.join('\n'));
    } finally {
      setExporting(false);
    }
  }, [rows, exporting]);

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
          <Button size="sm" variant="secondary" disabled={!rows.length || exporting} onClick={handleExport}>
            {exporting ? 'Preparing…' : 'Export CSV'}
          </Button>
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

      {selectedDetail && (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Ticket detail</p>
                <h3 className="text-xl font-semibold">
                  {selectedDetail.symbol} · {selectedDetail.strategy}
                </h3>
                <p className="text-sm text-gray-400">{fmtUtc(selectedDetail.opened_at_utc ?? selectedDetail.createdAtUtc)}</p>
              </div>
              <Badge tone={selectedDetail.status === 'COMPLETE' ? 'blue' : selectedDetail.actionable ? 'green' : 'amber'}>
                {selectedDetail.status ?? '—'}
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <DetailField label="Entry" value={fmtPrice(selectedDetail.entry_price ?? selectedDetail.entryPrice)} />
              <DetailField label="Stop" value={fmtPrice(selectedDetail.stop_price ?? selectedDetail.stopPrice)} />
              <DetailField label="Target" value={fmtPrice(selectedDetail.target_price ?? selectedDetail.targetPrice)} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <DetailField label="Qty" value={selectedDetail.qty ?? selectedDetail.quantity ?? '—'} />
              <DetailField
                label="Per-contract risk"
                value={currencyFormatter.format(selectedDetail.riskDollars ?? 0)}
              />
              <DetailField label="R:R" value={fmtR(selectedDetail.rrMultiple ?? selectedDetail.rr ?? null)} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Context</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(selectedDetail.tags ?? []).map((tag) => (
                  <Badge key={`${selectedDetail.id}-tag-${tag}`} tone="gray">
                    {tag}
                  </Badge>
                ))}
                {!selectedDetail.tags?.length && <span className="text-sm text-gray-500">No tags</span>}
              </div>
            </div>
            {selectedDetail.reasons && selectedDetail.reasons.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Reasons</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-gray-200">
                  {selectedDetail.reasons.map((reason) => (
                    <li key={`${selectedDetail.id}-reason-${reason}`}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

const DetailField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-sm font-mono text-gray-100">{value ?? '—'}</p>
  </div>
);
