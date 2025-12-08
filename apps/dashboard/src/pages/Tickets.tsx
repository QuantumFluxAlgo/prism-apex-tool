import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';

/**
 * PRISM APEX V2 – Tickets
 *
 * Test expectations (src/__tests__/Tickets.test.tsx):
 * - Calls fetch('/api/tickets') once.
 * - Shows "Loading tickets…" while fetching.
 * - When the mocked API returns:
 *     {
 *       total: 1,
 *       rows: [
 *         {
 *           id: 't-123',
 *           symbol: 'MESZ4',
 *           side: 'LONG',
 *           status: 'ACTIONED',
 *           strategy: 'VWAP',
 *           opened_at_utc: '2025-12-04T12:00:00Z',
 *         },
 *       ],
 *     }
 *   it must render: MESZ4, LONG, VWAP and something containing "12:00".
 * - When { total: 0, rows: [] }, it must show:
 *     "No tickets returned for the current filters".
 * - On fetch error, it must show text starting:
 *     "Error loading tickets:" and include the error message (e.g. "boom").
 *
 * This implementation keeps the V2 styling but uses a plain <table> instead of
 * the shared DataTable component to avoid column.render() issues in tests, and
 * ensures only a single instance of each status message exists in the DOM.
 */

type TicketSide = 'LONG' | 'SHORT';

interface TicketRow {
  id: string;
  symbol: string;
  strategy: string;
  side: TicketSide | string;
  status?: string;
  createdAt: string;
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
  rr?: number | null;
}

function normaliseTicketsPayload(payload: unknown): TicketRow[] {
  if (!payload || typeof payload !== 'object') return [];

  const anyPayload = payload as any;

  // Preferred shape for tests: { total, rows: [...] }
  let rows: any[] = [];
  if (Array.isArray(anyPayload.rows)) {
    rows = anyPayload.rows;
  } else if (Array.isArray(anyPayload.tickets)) {
    // Fallback if backend uses tickets[]
    rows = anyPayload.tickets;
  } else if (Array.isArray(payload)) {
    rows = payload as any[];
  }

  return rows
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const r = row as any;
      const sideRaw = (r.side ?? '').toString().toUpperCase();

      const side: TicketSide | string =
        sideRaw === 'LONG' || sideRaw === 'SHORT' ? sideRaw : sideRaw || '';

      const createdAt =
        typeof r.opened_at_utc === 'string' && r.opened_at_utc
          ? r.opened_at_utc
          : typeof r.createdAt === 'string' && r.createdAt
          ? r.createdAt
          : '';

      return {
        id: String(r.id ?? ''),
        symbol: String(r.symbol ?? ''),
        strategy: String(r.strategy ?? ''),
        side,
        status: r.status ? String(r.status) : undefined,
        createdAt,
        entry:
          typeof r.entry === 'number'
            ? r.entry
            : typeof r.entry_price === 'number'
            ? r.entry_price
            : null,
        stop:
          typeof r.stop === 'number'
            ? r.stop
            : typeof r.stop_price === 'number'
            ? r.stop_price
            : null,
        target:
          typeof r.target === 'number'
            ? r.target
            : typeof r.target_price === 'number'
            ? r.target_price
            : null,
        rr:
          typeof r.rr === 'number'
            ? r.rr
            : typeof r.rr_multiple === 'number'
            ? r.rr_multiple
            : null,
      };
    })
    .filter((row) => row.id && row.symbol);
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/tickets');

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} while fetching tickets`);
        }

        const payload = await res.json();
        const rows = normaliseTicketsPayload(payload);

        if (!cancelled) {
          setTickets(rows);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to fetch tickets';

        if (!cancelled) {
          setError(message);
          setTickets([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTickets();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasTickets = tickets.length > 0;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <section className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-semibold text-slate-100">Tickets</h1>
          <p className="text-xs text-slate-400">
            Canonical ticket history for the current environment. Use this view to
            audit how strategies, guardrails and execution behaved over the session.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" className="text-[10px]">
            Read-only · Operator audit
          </Badge>
        </div>
      </section>

      {/* Main card */}
      <section className="dashboard-card">
        <CardHeader className="dashboard-card__header px-4 py-3 rounded-t-2xl flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-slate-200">
              Ticket stream
            </span>
            <span className="text-[11px] text-slate-500">
              Latest tickets first. Use this view to cross-check Worklist decisions
              and outcomes.
            </span>
          </div>
          <div className="flex flex-col text-right text-[11px] text-slate-400">
            <span>Total tickets</span>
            <span className="font-geist-mono text-[12px] text-slate-100">
              {tickets.length}
            </span>
          </div>
        </CardHeader>

        <CardBody className="dashboard-card__body px-4 py-4 rounded-b-2xl space-y-2">
          {/* Table only – status messages appear exclusively inside the table body
              so Testing Library sees exactly one instance of each. */}
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
            <table className="dashboard-table min-w-full border-collapse text-left text-[11px] text-slate-200">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/80 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-3 py-2 font-normal">Created</th>
                  <th className="px-3 py-2 font-normal">Symbol</th>
                  <th className="px-3 py-2 font-normal">Strategy</th>
                  <th className="px-3 py-2 font-normal">Side</th>
                  <th className="px-3 py-2 font-normal">Entry</th>
                  <th className="px-3 py-2 font-normal">Stop</th>
                  <th className="px-3 py-2 font-normal">Target</th>
                  <th className="px-3 py-2 font-normal">R:R</th>
                </tr>
              </thead>
              <tbody>
                {/* Normal rows */}
                {hasTickets &&
                  tickets.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/60"
                    >
                      <td className="px-3 py-2 text-[11px] text-slate-500">
                        {row.createdAt}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-100">
                        {row.symbol}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-100">
                        {row.strategy}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-100">
                        {row.side}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-100">
                        {row.entry ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-100">
                        {row.stop ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-100">
                        {row.target ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-100">
                        {row.rr ?? '—'}
                      </td>
                    </tr>
                  ))}

                {/* Loading state – single instance of "Loading tickets…" */}
                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                    >
                      Loading tickets…
                    </td>
                  </tr>
                )}

                {/* Empty state – single instance of the exact test string */}
                {!loading && !error && !hasTickets && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                      style={{ color: 'var(--apex-text-muted)' }}
                    >
                      No tickets returned for the current filters.
                    </td>
                  </tr>
                )}

                {/* Error state – single instance of the prefix the tests look for */}
                {!loading && error && !hasTickets && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-4 text-center text-[11px] text-amber-300"
                    >
                      {/* Tests look for this prefix and the error text */}
                      Error loading tickets: {error}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </section>
    </div>
  );
}

