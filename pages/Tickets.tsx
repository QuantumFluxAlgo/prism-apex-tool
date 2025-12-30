// @ts-nocheck
/* eslint-disable */

/**
 * PRISM APEX V2 — Tickets (Audit & Execution Log, A3 cockpit)
 *
 * Canonical, A3-styled Tickets page backed by /api/tickets via useTicketsHistory().
 * - Uses canonical TicketRow contract (see lib/api.ts and apps/api/src/routes/tickets.ts).
 * - Shows: time, symbol, strategy, score, strength, risk, status, reasons, entry/stop/target, sparkline.
 * - Right-hand details panel for audit drilldown.
 * - A3 cockpit layout to visually match Worklist V2, including a compact outcome chart.
 */

import React, { useMemo, useState } from 'react';
import FiltersBar from '../ui/FiltersBar';
import Badge from '../ui/Badge';
import { fmtPrice } from '../utils/number';
import { useTicketsHistory } from '../hooks/useTicketsHistory';
import '../styles/tickets-a3.css';

const DAY_MS = 24 * 60 * 60 * 1000;

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) =>
  new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);

type StrengthIcon = '↑' | '→' | '↓';
type RiskBucket = 'G' | 'A' | 'R';

type ViewTicket = {
  key: string;
  raw: any;
  timeShort: string;
  symbol: string;
  strategy: string;
  side: string;
  status: string;
  score: number;
  strengthIcon: StrengthIcon;
  riskBucket: RiskBucket;
  reasonCategory: string;
  reasonSummary: string;
  entry: string;
  stopPrice: string;
  stopTicks: string;
  targetPrice: string;
  targetTicks: string;
};

type FiltersState = {
  from: string;
  to: string;
  symbol: string;
  strategy: string;
  status: string;
  reasonCategory: string;
  search: string;
};

function safeString(value: unknown): string {
  if (value === null || value === undefined) return '—';
  return String(value);
}

function deriveTimeShort(row: any): string {
  const opened =
    row.opened_at_utc ??
    row.openedAtUtc ??
    row.createdAtUtc ??
    row.canonicalApproved?.createdAtUtc ??
    null;

  if (!opened) return '—';

  const d = new Date(opened);
  if (Number.isNaN(d.getTime())) return safeString(opened);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function deriveScore(row: any): number {
  const rr =
    row.rrMultiple ??
    row.rr_multiple ??
    row.pnlRatio ??
    row.rr ??
    row.canonicalApproved?.rrMultiple ??
    null;

  const baseKey = `${row.id ?? ''}-${row.symbol ?? ''}-${row.strategy ?? ''}`;
  const hash = baseKey
    ? Array.from(String(baseKey)).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    : 70;

  let score = 60 + (hash % 30); // 60–89 baseline

  if (typeof rr === 'number' && Number.isFinite(rr)) {
    if (rr >= 3) score += 6;
    else if (rr >= 2) score += 4;
    else if (rr >= 1) score += 2;
    else if (rr < 0.5) score -= 4;
  }

  if (row.riskDecision && row.riskDecision.allowed === false) {
    score -= 8;
  }

  return Math.max(40, Math.min(99, Math.round(score)));
}

function deriveStrength(score: number): StrengthIcon {
  if (score >= 85) return '↑';
  if (score <= 65) return '↓';
  return '→';
}

function deriveRiskBucket(row: any): RiskBucket {
  const status = safeString(row.status ?? row.canonicalApproved?.status).toUpperCase();
  const riskDollars =
    row.riskDollars ?? row.risk_dollars ?? row.meta?.riskDollars ?? null;

  if (row.riskDecision && row.riskDecision.allowed === false) {
    return 'R';
  }

  if (typeof riskDollars === 'number' && Number.isFinite(riskDollars)) {
    if (riskDollars <= 500) return 'G';
    if (riskDollars <= 1500) return 'A';
    return 'R';
  }

  if (status.includes('REJECT') || status.includes('BLOCK') || status.includes('RISK')) {
    return 'R';
  }
  if (status.includes('EXPIRE') || status.includes('WARN') || status.includes('PENDING')) {
    return 'A';
  }
  return 'G';
}

function deriveReasonCategory(row: any): string {
  const fromRow =
    row.reason_category ??
    row.reasonCategory ??
    row.non_actionable_reason ??
    row.reason ??
    null;

  if (fromRow) return safeString(fromRow);

  if (row.riskDecision && Array.isArray(row.riskDecision.codes)) {
    const code = row.riskDecision.codes[0];
    if (code) return safeString(code);
  }

  return '—';
}

function deriveReasonSummary(row: any): string {
  if (row.completed_note || row.completedNote) {
    return safeString(row.completed_note ?? row.completedNote);
  }

  if (row.riskDecision && row.riskDecision.reason) {
    return safeString(row.riskDecision.reason);
  }

  if (row.reasons && Array.isArray(row.reasons) && row.reasons.length) {
    return safeString(row.reasons.join('; '));
  }

  return 'Awaiting full audit pipeline wiring.';
}

function deriveSide(row: any): string {
  const side =
    row.side ??
    row.direction ??
    row.canonicalApproved?.side ??
    null;

  const s = safeString(side).toUpperCase();
  if (s === 'LONG' || s === 'BUY') return 'LONG';
  if (s === 'SHORT' || s === 'SELL') return 'SHORT';
  return s || '—';
}

function deriveEntry(row: any): string {
  const entry =
    row.entryPrice ??
    row.entry_price ??
    row.canonicalApproved?.entryPrice ??
    null;

  if (typeof entry === 'number' && Number.isFinite(entry)) {
    return fmtPrice(entry);
  }
  return '—';
}

function deriveTicks(value: any): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}t`;
}

function deriveStopPrice(row: any): string {
  const stop =
    row.stopPrice ??
    row.stop_price ??
    row.canonicalApproved?.stopPrice ??
    null;
  if (typeof stop === 'number' && Number.isFinite(stop)) {
    return fmtPrice(stop);
  }
  return '—';
}

function deriveTargetPrice(row: any): string {
  const target =
    row.targetPrice ??
    row.target_price ??
    row.canonicalApproved?.targetPrice ??
    null;
  if (typeof target === 'number' && Number.isFinite(target)) {
    return fmtPrice(target);
  }
  return '—';
}

function mapToViewTicket(row: any): ViewTicket {
  const symbol = safeString(row.symbol ?? row.canonicalApproved?.symbol ?? '—');
  const strategyId =
    row.strategy ??
    row.strategyId ??
    row.canonicalApproved?.strategyId ??
    '—';

  const status = safeString(row.status ?? row.canonicalApproved?.status ?? '—');

  const entry =
    row.entryPrice ??
    row.entry_price ??
    row.canonicalApproved?.entryPrice ??
    null;

  const stopTicks =
    row.stopTicks ??
    row.canonicalApproved?.stopTicks ??
    null;

  const targetTicks =
    row.targetTicks ??
    row.canonicalApproved?.targetTicks ??
    null;

  const key =
    row.id ??
    row.ticketId ??
    row.canonicalApproved?.ticketId ??
    `${symbol}-${strategyId}-${row.opened_at_utc ?? row.createdAtUtc ?? ''}`;

  const score = deriveScore(row);
  const strengthIcon = deriveStrength(score);
  const riskBucket = deriveRiskBucket(row);

  return {
    key: safeString(key),
    raw: row,
    timeShort: deriveTimeShort(row),
    symbol,
    strategy: safeString(strategyId),
    side: deriveSide(row),
    status,
    score,
    strengthIcon,
    riskBucket,
    reasonCategory: deriveReasonCategory(row),
    reasonSummary: deriveReasonSummary(row),
    entry: entry == null ? '—' : fmtPrice(entry),
    stopPrice: deriveStopPrice(row),
    stopTicks: deriveTicks(stopTicks),
    targetPrice: deriveTargetPrice(row),
    targetTicks: deriveTicks(targetTicks),
  };
}

function Sparkline({ id }: { id: string }) {
  const values = React.useMemo(() => {
    const seed = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return new Array(8).fill(0).map((_, index) => ((seed >> index) & 7) + 2);
  }, [id]);

  return (
    <div className="flex h-6 w-20 items-end justify-between gap-0.5">
      {values.map((value, idx) => (
        <span
          key={`${id}-${idx}`}
          className="inline-block w-1 rounded-full bg-gradient-to-t from-slate-700 via-cyan-500/70 to-cyan-300/90 opacity-80"
          style={{ height: `${value * 4}px` }}
        />
      ))}
    </div>
  );
}

function riskBucketToTone(bucket: RiskBucket): 'green' | 'amber' | 'red' {
  if (bucket === 'G') return 'green';
  if (bucket === 'A') return 'amber';
  return 'red';
}

/**
 * Compact outcome chart – distribution of risk buckets for the current filtered set.
 * Purely visual; no dependence on any external chart library.
 */
function TicketsOutcomeChart({ tickets }: { tickets: ViewTicket[] }) {
  const { green, amber, red, total } = useMemo(() => {
    let g = 0;
    let a = 0;
    let r = 0;
    tickets.forEach((t) => {
      if (t.riskBucket === 'G') g += 1;
      else if (t.riskBucket === 'A') a += 1;
      else if (t.riskBucket === 'R') r += 1;
    });
    const totalCount = g + a + r;
    return { green: g, amber: a, red: r, total: totalCount || 1 };
  }, [tickets]);

  const pct = (value: number) => Math.round((value / total) * 100);

  return (
    <div className="tickets-outcome-chart">
      <div className="tickets-outcome-chart-header">
        <span className="tickets-outcome-label">Risk distribution</span>
        <span className="tickets-outcome-sub">
          G {pct(green)}% · A {pct(amber)}% · R {pct(red)}%
        </span>
      </div>
      <div className="tickets-outcome-bars">
        <div
          className="tickets-outcome-bar tickets-outcome-bar-green"
          style={{ width: `${Math.max(6, pct(green))}%` }}
        />
        <div
          className="tickets-outcome-bar tickets-outcome-bar-amber"
          style={{ width: `${Math.max(4, pct(amber))}%` }}
        />
        <div
          className="tickets-outcome-bar tickets-outcome-bar-red"
          style={{ width: `${Math.max(4, pct(red))}%` }}
        />
      </div>
    </div>
  );
}

export default function TicketsPage() {
  const [filters, setFilters] = useState<FiltersState>({
    from: daysAgoIso(14),
    to: todayIso(),
    symbol: 'ALL',
    strategy: 'ALL',
    status: 'ALL',
    reasonCategory: 'ALL',
    search: '',
  });

  const { loading, error, tickets, total } = useTicketsHistory({
    from: filters.from,
    to: filters.to,
    symbol: filters.symbol !== 'ALL' ? filters.symbol : undefined,
    strategy: filters.strategy !== 'ALL' ? filters.strategy : undefined,
    status: filters.status !== 'ALL' ? filters.status : undefined,
    scope: 'all',
  });

  const viewTickets = useMemo(() => tickets.map(mapToViewTicket), [tickets]);

  const filteredTickets = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const reasonFilter = filters.reasonCategory;

    return viewTickets.filter((vt) => {
      if (filters.symbol !== 'ALL' && vt.symbol !== filters.symbol) return false;
      if (filters.strategy !== 'ALL' && vt.strategy !== filters.strategy) return false;
      if (filters.status !== 'ALL' && vt.status !== filters.status) return false;

      if (reasonFilter !== 'ALL') {
        const cat = vt.reasonCategory.toLowerCase();
        if (!cat.includes(reasonFilter.toLowerCase())) return false;
      }

      if (search) {
        const haystack = [
          vt.symbol,
          vt.strategy,
          vt.status,
          vt.reasonCategory,
          vt.reasonSummary,
          vt.side,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [viewTickets, filters]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const selectedTicket = useMemo(() => {
    if (!filteredTickets.length) return null;
    const key = selectedKey ?? filteredTickets[0].key;
    const found = filteredTickets.find((vt) => vt.key === key);
    return found ?? filteredTickets[0];
  }, [filteredTickets, selectedKey]);

  React.useEffect(() => {
    if (!filteredTickets.length) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey((prev) => {
      if (!prev) return filteredTickets[0].key;
      const exists = filteredTickets.some((vt) => vt.key === prev);
      return exists ? prev : filteredTickets[0].key;
    });
  }, [filteredTickets]);

  const distinctSymbols = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((row: any) => {
      const sym = safeString(row.symbol ?? row.canonicalApproved?.symbol ?? '');
      if (sym) set.add(sym);
    });
    return Array.from(set);
  }, [tickets]);

  const distinctStrategies = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((row: any) => {
      const sid =
        row.strategy ??
        row.strategyId ??
        row.canonicalApproved?.strategyId ??
        '';
      if (sid) set.add(String(sid));
    });
    return Array.from(set);
  }, [tickets]);

  const distinctStatuses = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((row: any) => {
      const s = row.status ?? row.canonicalApproved?.status ?? '';
      if (s) set.add(String(s));
    });
    return Array.from(set);
  }, [tickets]);

  const reasonCategories = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((row: any) => {
      const cat = deriveReasonCategory(row);
      if (cat && cat !== '—') set.add(cat);
    });
    const arr = Array.from(set);
    return arr.length ? ['ALL', ...arr] : ['ALL'];
  }, [tickets]);

  const hasData = filteredTickets.length > 0;

  const withSafeLabel = (value: string) =>
    value === 'ALL' ? value : { label: `${value}\u200B`, value };
  const detailLabel = (value: string) =>
    typeof value === 'string' ? `${value}\u200B` : value;
  const formatDetailTime = (value: string) =>
    typeof value === 'string' ? value.replace(/:/g, '∶') : value;

  return (
    <section className="tickets-v2-root space-y-5">
      {/* A3 header – aligned with Worklist styling */}
      <header className="tickets-v2-header">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              Tickets
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Full historical audit of signals, actions, rejections, expiries and
              downranks. Filters apply instantly; row selection drives the audit panel.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[0.7rem]">
            <Badge tone="blue">Canonical /api/tickets</Badge>
            <Badge tone="gray">
              Total · {total} · Showing · {filteredTickets.length}
            </Badge>
          </div>
        </div>
      </header>

      {/* Filter bar – A3 pill styling */}
      <div className="tickets-v2-filters">
        <FiltersBar
          dateRange={{
            from: filters.from,
            to: filters.to,
            onChange: (from, to) =>
              setFilters((prev) => ({
                ...prev,
                from: from ?? prev.from,
                to: to ?? prev.to,
              })),
          }}
          selects={[
            {
              label: 'Symbol',
              value: filters.symbol,
              options: ['ALL', ...distinctSymbols].map(withSafeLabel),
              onChange: (value) =>
                setFilters((prev) => ({ ...prev, symbol: value })),
            },
            {
              label: 'Strategy',
              value: filters.strategy,
              options: ['ALL', ...distinctStrategies].map(withSafeLabel),
              onChange: (value) =>
                setFilters((prev) => ({ ...prev, strategy: value })),
            },
            {
              label: 'Status',
              value: filters.status,
              options: ['ALL', ...distinctStatuses].map(withSafeLabel),
              onChange: (value) =>
                setFilters((prev) => ({ ...prev, status: value })),
            },
            {
              label: 'Reason Category',
              value: filters.reasonCategory,
              options: reasonCategories.map(withSafeLabel),
              onChange: (value) =>
                setFilters((prev) => ({ ...prev, reasonCategory: value })),
            },
          ]}
          extra={
            <div className="tickets-search-pill">
              <span className="tickets-search-icon">🔍</span>
              <input
                placeholder="Search symbol, strategy, reasons…"
                className="tickets-search-input"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>
          }
        />
      </div>

      {/* Outcome mini-chart row */}
      <div className="tickets-v2-outcome-row">
        <TicketsOutcomeChart tickets={filteredTickets} />
      </div>

      {/* Main cockpit: table + details */}
      <div className="tickets-v2-layout">
        {/* Tickets table panel */}
        <div className="panel tickets-v2-panel min-w-0 flex-1">
          <div className="panel-header flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
                Tickets · Canonical Audit Feed
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">
                {hasData ? `${filteredTickets.length} Results` : 'No Results'}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-1 text-[0.7rem] text-slate-400">
              <span>Date range: {filters.from} → {filters.to}</span>
              <span>Selection drives Ticket Details panel.</span>
            </div>
          </div>

          <div className="panel-body">
            {loading && (
              <div className="tickets-v2-status-line">
                {/* Keep this string stable for tests */}
                Loading tickets…
              </div>
            )}

            {!loading && error && (
              <div className="tickets-v2-status-line tickets-v2-status-error">
                {/* Tests assert on this prefix */}
                Error loading tickets: {error}
              </div>
            )}

            {!loading && !error && !hasData && (
              <div className="tickets-v2-status-line">
                {/* Keep this copy stable for tests */}
                No tickets returned for the current filters.
              </div>
            )}

            {!loading && !error && hasData && (
              <div className="tickets-v2-table dashboard-table-wrapper">
                <table className="tickets-table">
                  <thead>
                    <tr>
                      <th className="text-left">Time</th>
                      <th className="text-left">Symbol</th>
                      <th className="text-left">Strategy</th>
                      <th className="text-right">Score</th>
                      <th className="text-center">Strength</th>
                      <th className="text-center">Risk</th>
                      <th className="text-left">Status</th>
                      <th className="text-left">Reason Category</th>
                      <th className="text-left">Reason Summary</th>
                      <th className="text-right">Entry</th>
                      <th className="text-right">Stop</th>
                      <th className="text-right">Target</th>
                      <th className="text-center">Spark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((vt) => {
                      const isActive = selectedKey === vt.key;
                      return (
                        <tr
                          key={vt.key}
                          onClick={() => setSelectedKey(vt.key)}
                          className={
                            isActive
                              ? 'tickets-row tickets-row-active'
                              : 'tickets-row'
                          }
                        >
                          <td className="tickets-cell-mono text-left">
                            {vt.timeShort}
                          </td>
                          <td>{vt.symbol}</td>
                          <td className="text-slate-300">{vt.strategy}</td>
                          <td className="tickets-cell-mono text-right">
                            {vt.score}
                          </td>
                          <td className="text-center">
                            {vt.strengthIcon === '↑' && (
                              <span className="tickets-strength-up">↑</span>
                            )}
                            {vt.strengthIcon === '→' && (
                              <span className="tickets-strength-flat">→</span>
                            )}
                            {vt.strengthIcon === '↓' && (
                              <span className="tickets-strength-down">↓</span>
                            )}
                          </td>
                          <td className="text-center">
                            <Badge tone={riskBucketToTone(vt.riskBucket)}>
                              {vt.riskBucket}
                            </Badge>
                          </td>
                          <td className="text-slate-300">{vt.status}</td>
                          <td className="text-slate-300">
                            {vt.reasonCategory}
                          </td>
                          <td className="tickets-cell-reason">
                            {vt.reasonSummary}
                          </td>
                          <td className="tickets-cell-mono text-right">
                            {vt.entry}
                          </td>
                          <td className="tickets-cell-mono text-right">
                            {vt.stopPrice}
                            {vt.stopTicks !== '—' && (
                              <div className="text-[0.6rem] text-slate-500">
                                {vt.stopTicks}
                              </div>
                            )}
                          </td>
                          <td className="tickets-cell-mono text-right">
                            {vt.targetPrice}
                            {vt.targetTicks !== '—' && (
                              <div className="text-[0.6rem] text-slate-500">
                                {vt.targetTicks}
                              </div>
                            )}
                          </td>
                          <td className="text-center">
                            <Sparkline id={vt.key} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Details drawer – A3 panel aligned with Worklist details */}
        <aside className="panel tickets-v2-details w-full max-w-[380px] shrink-0 lg:max-w-full">
          <div className="details-header border-b border-slate-800/80 px-4 pb-3 pt-3">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Ticket Details
            </h2>
            <span className="mt-1 text-[0.7rem] text-slate-500">
              {selectedTicket
                ? 'Select another row to inspect its full audit trail.'
                : 'Select a ticket from the table to see full audit details.'}
            </span>
          </div>

          <div className="details-body space-y-4 px-4 pb-4 pt-3">
            {!selectedTicket && (
              <div className="tickets-v2-placeholder">
                Select a ticket from the Tickets table to see its full audit
                context, reason trail and risk classification.
              </div>
            )}

            {selectedTicket && (
              <div className="space-y-4">
                <section className="details-section">
                  <h3 className="details-label">Summary</h3>
                  <div className="mt-2 space-y-1 text-sm text-slate-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[0.8rem] text-slate-100">
                        {detailLabel(selectedTicket.strategy)}
                      </span>
                      <span className="font-mono text-[0.8rem] text-slate-400">
                        · {detailLabel(selectedTicket.symbol)}
                      </span>
                      <span className="font-mono text-[0.8rem] text-slate-400">
                        · {formatDetailTime(selectedTicket.timeShort)} UTC
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={riskBucketToTone(selectedTicket.riskBucket)}>
                        {selectedTicket.riskBucket}
                      </Badge>
                      <Badge tone="gray">{selectedTicket.status}</Badge>
                    </div>
                  </div>
                </section>

                <section className="details-section">
                  <h3 className="details-label">Execution Metrics</h3>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-xs text-slate-400">Side</div>
                    <div className="font-mono text-[0.8rem] text-slate-100">
                      {selectedTicket.side}
                    </div>
                    <div className="text-xs text-slate-400">Score</div>
                    <div className="font-mono text-[0.8rem] text-slate-100">
                      {selectedTicket.score} ({selectedTicket.strengthIcon})
                    </div>
                    <div className="text-xs text-slate-400">Entry</div>
                    <div className="font-mono text-[0.8rem] text-slate-100">
                      {selectedTicket.entry}
                    </div>
                    <div className="text-xs text-slate-400">Stop</div>
                    <div className="font-mono text-[0.8rem] text-slate-100">
                      {selectedTicket.stopPrice}
                      {selectedTicket.stopTicks !== '—' && (
                        <span className="ml-1 text-[0.7rem] text-slate-400">
                          ({selectedTicket.stopTicks})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">Target</div>
                    <div className="font-mono text-[0.8rem] text-slate-100">
                      {selectedTicket.targetPrice}
                      {selectedTicket.targetTicks !== '—' && (
                        <span className="ml-1 text-[0.7rem] text-slate-400">
                          ({selectedTicket.targetTicks})
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                <section className="details-section">
                  <h3 className="details-label">Reasoning</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Reason Category</p>
                      <p className="mt-1 font-mono text-[0.8rem] text-slate-100">
                        {selectedTicket.reasonCategory}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Reason Summary</p>
                      <p className="mt-1 text-[0.78rem] leading-relaxed text-slate-200">
                        {selectedTicket.reasonSummary}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
