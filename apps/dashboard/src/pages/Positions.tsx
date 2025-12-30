/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */

import React from 'react';
import type { CanonicalTicket } from '@prism-apex/shared';

import { fmtUtc } from '../utils/time';
import { fmtPrice } from '../utils/number';
import {
  fetchAnalyticsCanonicalTickets,
  fetchTickets,
  buildCanonicalTicketFromRow,
} from '../lib/api';
import { logContractError, logPageLoad } from '../lib/contractTelemetry';
import Kpi from '../ui/Kpi';
import { Card } from '../ui/Card';

/**
 * PRISM APEX V2 – Positions Snapshot (synthetic)
 *
 * Constraints:
 * - There is NO live broker / Tradovate positions API yet.
 * - We therefore build a synthetic positions view from canonical tickets:
 *   - Uses analytics tickets over a short window.
 *   - Falls back to /api/tickets if analytics helper is empty.
 */

type PositionKey = string;

type SyntheticPosition = {
  key: PositionKey;
  symbol: string;
  strategy: string;
  side: string;
  contracts: number;
  avgEntry: number | null;
  riskDollars: number | null;
  avgRMultiple: number | null;
  lastUpdatedUtc: string | null;
  sampleTicketId: string;
};

function computeRange(days: number): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now.getTime());
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

function buildSyntheticPositions(tickets: CanonicalTicket[]): SyntheticPosition[] {
  const openTickets = tickets.filter((t) => {
    const status = (t.status ?? '').toUpperCase();
    if (status === 'COMPLETED' || status === 'CANCELLED') return false;
    return t.symbol && t.side;
  });

  const map = new Map<string, SyntheticPosition & {
    weightedEntry: number;
    totalRisk: number;
    rrValues: number[];
  }>();

  for (const ticket of openTickets) {
    const symbol = ticket.symbol!;
    const strategy = ticket.strategyId ?? 'UNKNOWN';
    const side = (ticket.side ?? '').toUpperCase() || 'UNKNOWN';
    const key = `${symbol}|${strategy}|${side}`;

    const qty = typeof ticket.quantity === 'number' ? ticket.quantity : 0;
    const entry = typeof ticket.entryPrice === 'number' ? ticket.entryPrice : 0;
    const risk = typeof ticket.totalRisk === 'number' ? ticket.totalRisk : 0;
    const rr = typeof ticket.rrMultiple === 'number' ? ticket.rrMultiple : null;
    const updatedAt =
      ticket.completedAtUtc || ticket.updatedAtUtc || ticket.createdAtUtc || ticket.sessionDateUtc || null;

    if (!map.has(key)) {
      map.set(key, {
        key,
        symbol,
        strategy,
        side,
        contracts: 0,
        weightedEntry: 0,
        avgEntry: null,
        totalRisk: 0,
        riskDollars: null,
        avgRMultiple: null,
        rrValues: [],
        lastUpdatedUtc: updatedAt,
        sampleTicketId: ticket.id,
      });
    }

    const bucket = map.get(key)!;
    bucket.contracts += qty;
    bucket.weightedEntry += entry * qty;
    bucket.totalRisk += risk;
    if (rr !== null) bucket.rrValues.push(rr);
    if (
      updatedAt &&
      (!bucket.lastUpdatedUtc || Date.parse(updatedAt) > Date.parse(bucket.lastUpdatedUtc))
    ) {
      bucket.lastUpdatedUtc = updatedAt;
      bucket.sampleTicketId = ticket.id;
    }
  }

  const positions: SyntheticPosition[] = [];

  for (const bucket of map.values()) {
    positions.push({
      key: bucket.key,
      symbol: bucket.symbol,
      strategy: bucket.strategy,
      side: bucket.side,
      contracts: bucket.contracts,
      avgEntry:
        bucket.contracts > 0 ? Number((bucket.weightedEntry / bucket.contracts).toFixed(2)) : null,
      riskDollars: bucket.totalRisk ? Number(bucket.totalRisk.toFixed(2)) : null,
      avgRMultiple: bucket.rrValues.length
        ? Number(
            (
              bucket.rrValues.reduce((acc, r) => acc + r, 0) / bucket.rrValues.length
            ).toFixed(2),
          )
        : null,
      lastUpdatedUtc: bucket.lastUpdatedUtc,
      sampleTicketId: bucket.sampleTicketId,
    });
  }

  positions.sort((a, b) => {
    if (a.symbol === b.symbol) {
      return a.strategy.localeCompare(b.strategy) || a.side.localeCompare(b.side);
    }
    return a.symbol.localeCompare(b.symbol);
  });

  return positions;
}

export default function PositionsPage() {
  const [loadingData, setLoadingData] = React.useState<boolean>(false);
  const [tickets, setTickets] = React.useState<CanonicalTicket[]>([]);
  const [positions, setPositions] = React.useState<SyntheticPosition[]>([]);

  React.useEffect(() => {
    logPageLoad('Positions');
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingData(true);
      try {
        const { from, to } = computeRange(7);

        let canonical: CanonicalTicket[] = [];
        try {
          const apiTickets = await fetchAnalyticsCanonicalTickets({ from, to, limit: 400 });
          if (Array.isArray(apiTickets) && apiTickets.length > 0) {
            canonical = apiTickets;
          }
        } catch (err) {
          logContractError({
            pageId: 'Positions',
            endpoint: 'analytics.canonical',
            error: err,
          });
        }

        if (!canonical.length) {
          try {
            const { rows = [] } = await fetchTickets({
              from,
              to,
              status: "OPEN",
              scope: "actionable",
              limit: 500,
            });
            canonical = rows
              .map((row) => buildCanonicalTicketFromRow(row))
              .filter((ticket): ticket is CanonicalTicket => Boolean(ticket));
          } catch (err) {
            logContractError({
              pageId: 'Positions',
              endpoint: '/api/tickets',
              error: err,
            });
          }
        }

        if (!canonical.length) {
          canonical = [];
        }

        if (cancelled) return;

        setTickets(canonical);
        setPositions(buildSyntheticPositions(canonical));
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const activePositionsCount = positions.length;
  const symbolsActiveCount = new Set(positions.map((p) => p.symbol)).size;
  const totalContracts = positions.reduce((acc, p) => acc + (p.contracts || 0), 0);

  return (
    <div className="a3-page-root">
      <header className="a3-page-header">
        <div>
          <div className="a3-page-section-label">Synthetic exposure</div>
          <h1>Positions snapshot</h1>
          <p>Aggregated from canonical tickets; no live broker positions API is wired yet.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="a3-chip a3-chip--muted">
            {loadingData ? 'Loading synthetic positions…' : 'Tickets-only input'}
          </span>
        </div>
      </header>

      <section className="a3-page-main-card space-y-4">
        <div className="a3-page-kpi-strip">
          <Kpi label="Active positions" value={activePositionsCount || '—'} tone="indigo" sublabel="Derived from open tickets" />
          <Kpi label="Symbols active" value={symbolsActiveCount || '—'} tone="cyan" sublabel="Unique markets in exposure" />
          <Kpi label="Contracts (synthetic)" value={totalContracts || '—'} tone="emerald" sublabel="Sum of ticket quantities" />
          <Kpi label="Unrealized PnL" value="—" tone="neutral" sublabel="Not tracked in synthetic view" />
        </div>

        <Card className="a3-page-table-card">
          <div className="a3-table-headline px-4 py-3">
            <div>
              <div className="text-[0.75rem] uppercase tracking-[0.18em] text-slate-400">
                Positions (synthetic from ticket history)
              </div>
              <div className="text-[0.7rem] text-slate-400">
                Aggregates non-completed tickets into per-symbol exposures.
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-[10px] text-slate-400">
              <span>
                Tickets in sample:&nbsp;
                <span className="font-mono text-[11px] text-slate-100">
                  {tickets.length || '0'}
                </span>
              </span>
              <span>
                Synthetic positions:&nbsp;
                <span className="font-mono text-[11px] text-slate-100">
                  {activePositionsCount || '0'}
                </span>
              </span>
            </div>
          </div>
          <div className="a3-page-table-scroll a3-scroll-soft px-4 pb-4">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="text-left">Symbol</th>
                  <th className="text-left">Strategy</th>
                  <th className="text-left">Side</th>
                  <th className="text-right">Contracts</th>
                  <th className="text-right">Avg entry</th>
                  <th className="text-right">Risk ($)</th>
                  <th className="text-right">Avg R</th>
                  <th className="text-left">Sample ticket</th>
                  <th className="text-left">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-slate-500">
                      No synthetic positions available. Either there are no open tickets in
                      the recent window, or the engine is not emitting canonical ticket
                      status yet.
                    </td>
                  </tr>
                ) : (
                  positions.map((pos) => (
                    <tr key={pos.key}>
                      <td className="text-left">{pos.symbol}</td>
                      <td className="text-left">{pos.strategy}</td>
                      <td className="text-left">{pos.side}</td>
                      <td className="text-right">{pos.contracts}</td>
                      <td className="text-right">{pos.avgEntry != null ? fmtPrice(pos.avgEntry) : '—'}</td>
                      <td className="text-right">
                        {pos.riskDollars != null ? pos.riskDollars.toFixed(0) : '—'}
                      </td>
                      <td className="text-right">
                        {pos.avgRMultiple != null ? pos.avgRMultiple.toFixed(2) : '—'}
                      </td>
                      <td className="text-left">
                        <span className="font-mono text-[0.8rem]">{pos.sampleTicketId}</span>
                      </td>
                      <td className="text-left">
                        {pos.lastUpdatedUtc ? fmtUtc(pos.lastUpdatedUtc) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
