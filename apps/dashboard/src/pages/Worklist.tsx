import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import FiltersBar from '../ui/FiltersBar';
import Kpi from '../ui/Kpi';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { fetchTickets, completeTicket, type TicketRow } from '../lib/api';
import { fmtUtc } from '../utils/time';
import { fmtPrice } from '../utils/number';

type ActionableRow = TicketRow & {
  rr?: number | null;
  actionable?: boolean | null;
};

export default function Worklist() {
  const [rows, setRows] = useState<ActionableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchTickets({ scope: 'actionable', status: 'OPEN', direction: 'LONG', limit: 200 });
      setRows(res.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
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
      render: (row) => fmtPrice(row.stop_price ?? undefined),
    },
    {
      key: 'target_price',
      header: 'Target',
      align: 'right',
      render: (row) => fmtPrice(row.target_price ?? undefined),
    },
    {
      key: 'rr',
      header: 'R',
      align: 'right',
      render: (row) => (row.rr !== null && row.rr !== undefined ? row.rr.toFixed(2) : '—'),
    },
    {
      key: 'pnl',
      header: 'PnL',
      align: 'right',
      render: (row) => fmtPrice(row.pnl ?? undefined),
    },
    {
      key: 'action',
      header: '',
      className: 'text-right',
      render: (row) => (
        <Button
          size="sm"
          variant="primary"
          onClick={async () => {
            if (!row.id) return;
            try {
              const updated = await completeTicket(String(row.id), { user: 'operator', note: 'worklist' });
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
          <Button size="sm" variant="ghost" onClick={() => void load()}>
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
