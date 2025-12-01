#!/usr/bin/env bash
set -euo pipefail

cd ~/Projects/prism-apex-tool
cd "$(git rev-parse --show-toplevel)"

echo "=== PATCH: Tickets & MarketData – ExecutionShell + V2 styling ==="

###############################################################################
# Rewrite Tickets.tsx
###############################################################################
cat > apps/dashboard/src/pages/Tickets.tsx << 'TSX'
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
TSX

###############################################################################
# Rewrite MarketData.tsx
###############################################################################
cat > apps/dashboard/src/pages/MarketData.tsx << 'TSX'
// @ts-nocheck
/* eslint-disable */
/**
 * PRISM APEX V2 — Market Data
 *
 * Intent:
 * - Use live endpoints without assuming their shape.
 * - Wrap in ExecutionShell and match V2 visual system.
 * - Keep behaviour conservative and resilient.
 */

import React, { useEffect, useState } from 'react';
import ExecutionShell from '../layouts/ExecutionShell';
import { Card, CardBody, CardHeader } from '../ui/Card';

type SymbolSummary = {
  symbol: string;
  lastClose?: number;
  lastIngestUtc?: string;
};

type FetchState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

const SYMBOLS_ENDPOINT = '/api/symbols';
const SESSION_METRICS_ENDPOINT = '/api/session-metrics';

export default function MarketDataPage() {
  const [symbolsState, setSymbolsState] = useState<FetchState<SymbolSummary[]>>({
    loading: true,
    error: null,
    data: null,
  });

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const [metricsState, setMetricsState] = useState<FetchState<unknown>>({
    loading: false,
    error: null,
    data: null,
  });

  // Load available symbols once
  useEffect(() => {
    let cancelled = false;

    async function loadSymbols() {
      setSymbolsState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(SYMBOLS_ENDPOINT);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          if (!cancelled) {
            setSymbolsState({
              loading: false,
              error: `Failed to load symbols (${res.status}) ${text}`,
              data: null,
            });
          }
          return;
        }

        const json = await res.json().catch(() => null);
        const list = Array.isArray(json) ? (json as SymbolSummary[]) : [];

        if (!cancelled) {
          setSymbolsState({
            loading: false,
            error: null,
            data: list,
          });

          if (!selectedSymbol && list.length > 0) {
            setSelectedSymbol(list[0].symbol);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSymbolsState({
            loading: false,
            error: `Error loading symbols: ${String(err)}`,
            data: null,
          });
        }
      }
    }

    loadSymbols();

    return () => {
      cancelled = true;
    };
  }, []); // run once

  // Load session metrics when symbol changes
  useEffect(() => {
    if (!selectedSymbol) {
      setMetricsState({ loading: false, error: null, data: null });
      return;
    }

    let cancelled = false;

    async function loadMetrics() {
      setMetricsState({ loading: true, error: null, data: null });

      try {
        const url = `${SESSION_METRICS_ENDPOINT}?symbol=${encodeURIComponent(
          selectedSymbol,
        )}`;
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          if (!cancelled) {
            setMetricsState({
              loading: false,
              error: `Failed to load session metrics (${res.status}) ${text}`,
              data: null,
            });
          }
          return;
        }

        const json = await res.json().catch(() => null);

        if (!cancelled) {
          setMetricsState({
            loading: false,
            error: null,
            data: json,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setMetricsState({
            loading: false,
            error: `Error loading session metrics: ${String(err)}`,
            data: null,
          });
        }
      }
    }

    loadMetrics();

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol]);

  const symbols = symbolsState.data || [];

  return (
    <ExecutionShell activeTab="markets">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight text-slate-50">
            Market Data
          </h1>
          <p className="text-xs text-slate-400">
            Lightweight view to validate symbol coverage and session metrics
            without risking runtime errors.
          </p>
        </header>

        <Card>
          <CardHeader>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Symbol & coverage
            </h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Symbol
                </span>
                <select
                  className="h-8 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
                  value={selectedSymbol || ''}
                  onChange={(e) => setSelectedSymbol(e.target.value || null)}
                >
                  {symbols.length === 0 && (
                    <option value="" disabled>
                      {symbolsState.loading
                        ? 'Loading symbols…'
                        : 'No symbols available'}
                    </option>
                  )}
                  {symbols.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol}
                    </option>
                  ))}
                </select>
                {symbolsState.error && (
                  <p className="mt-1 text-[11px] text-red-300">
                    {symbolsState.error}
                  </p>
                )}
              </div>

              {selectedSymbol && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Selected
                  </span>
                  <span className="text-xs font-mono text-slate-100">
                    {selectedSymbol}
                  </span>
                </div>
              )}

              <div className="ml-auto flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Symbols loaded
                </span>
                <span className="text-xs text-slate-200">
                  {symbols.length}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Coverage
              </h2>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-slate-300">
                Symbols loaded:{' '}
                <span className="font-semibold">{symbols.length}</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Backed by /api/symbols. Exact shape is intentionally loose to keep this
                view resilient to DTO churn.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Metrics status
              </h2>
            </CardHeader>
            <CardBody>
              {metricsState.loading && (
                <p className="text-sm text-slate-300">
                  Loading session metrics…
                </p>
              )}
              {!metricsState.loading && metricsState.error && (
                <p className="text-sm text-red-300">{metricsState.error}</p>
              )}
              {!metricsState.loading &&
                !metricsState.error &&
                metricsState.data && (
                  <p className="text-sm text-emerald-300">
                    Session metrics loaded.
                  </p>
                )}
              {!metricsState.loading &&
                !metricsState.error &&
                !metricsState.data && (
                  <p className="text-sm text-slate-400">
                    No metrics returned for current selection.
                  </p>
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
              <p className="text-[11px] text-slate-400">
                This is a V2-safe scaffold. Once DTOs stabilise, plug in proper charts
                and trade context using the same fetch pattern and defensive guards.
              </p>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Raw metrics payload
            </h2>
          </CardHeader>
          <CardBody>
            <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-900/80 p-3 text-[11px] text-slate-100">
{JSON.stringify(metricsState.data, null, 2) || 'null'}
            </pre>
          </CardBody>
        </Card>
      </div>
    </ExecutionShell>
  );
}
TSX

echo
echo "--- Dashboard build ---"
pnpm -C apps/dashboard run build

echo
echo "--- V2 build audit ---"
./scripts/run_v2_build_audit.sh || true

echo
echo "=== PATCH COMPLETE – Tickets & MarketData now use ExecutionShell + V2 styling ==="
