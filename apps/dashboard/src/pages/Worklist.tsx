import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import FiltersBar from '../ui/FiltersBar';
import Kpi from '../ui/Kpi';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { fetchTickets, completeTicket, type TicketRow } from '../lib/api';
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

export default function Worklist() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ActionableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    let ok = false;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchTickets({ scope: 'actionable', status: 'OPEN', direction: 'LONG', limit: 200 });
      setRows(res.rows ?? []);
      ok = true;
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
    return ok;
  }, []);

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

  const columns: DataTableColumn<ActionableRow>[] = [
    {
      key: 'opened_at_utc',
      header: 'Opened (UTC/GMT)',
      render: (row) => fmtUtc(row.opened_at_utc),
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
      <span title={tooltipDist(row.symbol, row.entry_price, row.stop_price, 'Stop Δ')}>
        {fmtPrice(row.stop_price ?? undefined)}
      </span>
    ),
    },
    {
      key: 'target_price',
      header: 'Target',
      align: 'right',
      render: (row) => (
      <span title={tooltipDist(row.symbol, row.entry_price, row.target_price, 'Target Δ')}>
        {fmtPrice(row.target_price ?? undefined)}
      </span>
    ),
    },
    {
      key: 'rr',
      header: 'R',
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
          <Badge tone={tone} title={tooltipPnL(row.symbol, row.entry_price, row.exit_price)}>
            {fmtPnlUSD(pnl)}
          </Badge>
        );
      },
    },
    {
      key: 'reason',
      header: 'Warning',
      render: (row) => (row.reason ? <span className="text-xs text-amber-600 dark:text-amber-300">{row.reason}</span> : '—'),
    },
    {
      key: 'action',
      header: '',
      className: 'text-right',
      render: (row) => (
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
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          }}
        >
          Mark Complete
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <FiltersBar>
        <div className="flex w-full items-center justify-between">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Actionable Worklist</div>
          <Button size="sm" variant="ghost" onClick={() => { void load(); }}>
            Refresh
          </Button>
        </div>
      </FiltersBar>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Open Actionable" value={rows.length} />
        <Kpi label="Symbols" value={symbolCount} />
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyMessage="No actionable tickets at the moment."
        rowKey={(row, index) => (row.id ? String(row.id) : index)}
      />
    </div>
  );
}
