// @ts-nocheck
/* eslint-disable */
/**
 * PRISM APEX V2 — Tickets
 *
 * Intent:
 * - Wrap the safe tickets stub in the shared ExecutionShell chrome.
 * - Align styling, fonts, and layout with V2 design system.
 * - Keep DTO assumptions shallow and resilient.
 */

import React, { useEffect, useState } from 'react';
import ExecutionShell from '../layouts/ExecutionShell';
import { Card, CardBody, CardHeader } from '../ui/Card';

type Ticket = {
  id?: string | number;
  symbol?: string;
  side?: string;
  status?: string;
  strategy?: string;
  openedAtUtc?: string;
};

type FetchState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

const TICKETS_ENDPOINT =
  '/api/tickets?status=OPEN&scope=actionable&direction=ANY&limit=20&offset=0';

export default function TicketsPage() {
  const [state, setState] = useState<FetchState<Ticket[]>>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      setState({ loading: true, error: null, data: null });

      try {
        const res = await fetch(TICKETS_ENDPOINT);
        const text = await res.text().catch(() => '');

        if (!res.ok) {
          if (!cancelled) {
            setState({
              loading: false,
              error: `Failed to load tickets (${res.status}) ${text}`,
              data: null,
            });
          }
          return;
        }

        let json: unknown = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = null;
        }

        const items: Ticket[] = Array.isArray(json) ? (json as Ticket[]) : [];

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            data: items,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            error: `Error loading tickets: ${String(err)}`,
            data: null,
          });
        }
      }
    }

    loadTickets();

    return () => {
      cancelled = true;
    };
  }, []);

  const tickets = state.data || [];
  const hasTickets = tickets.length > 0;

  return (
    <ExecutionShell activeTab="tickets">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight text-slate-50">
            Tickets
          </h1>
          <p className="text-xs text-slate-400">
            Simple, resilient view of open tickets. Shape is intentionally shallow to
            tolerate DTO evolution while we harden the V2 pipeline.
          </p>
        </header>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Open tickets
              </h2>
              <span className="text-[11px] text-slate-500">
                {state.loading
                  ? 'Loading…'
                  : hasTickets
                  ? `${tickets.length} ticket(s)`
                  : 'No tickets'}
              </span>
            </div>
          </CardHeader>
          <CardBody>
            {state.loading && (
              <p className="text-sm text-slate-300">Loading tickets…</p>
            )}

            {!state.loading && state.error && (
              <p className="text-sm text-red-300">{state.error}</p>
            )}

            {!state.loading && !state.error && !hasTickets && (
              <p className="text-sm text-slate-300">
                No tickets returned for the current filters.
              </p>
            )}

            {!state.loading && !state.error && hasTickets && (
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
                <table className="min-w-full divide-y divide-slate-800 text-xs">
                  <thead className="bg-slate-900/80">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        ID
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Symbol
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Side
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Strategy
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Opened (UTC)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/80 bg-slate-950/80">
                    {tickets.map((t, idx) => (
                      <tr key={(t.id as string) ?? idx}>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-200">
                          {t.id ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-100">
                          {t.symbol ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-200">
                          {t.side ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-200">
                          {t.status ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-200">
                          {t.strategy ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-300">
                          {t.openedAtUtc ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Notes
            </h2>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-slate-400">
              This view is V2-safe scaffolding. Once the ticket DTOs are final, replace
              this with the full spec layout (score, RR, context, actions) using the
              same fetch pattern and defensive guards.
            </p>
          </CardBody>
        </Card>
      </div>
    </ExecutionShell>
  );
}
