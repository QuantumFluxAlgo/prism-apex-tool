// @ts-nocheck
/* eslint-disable */
/**
 * PRISM APEX V2 — Tickets (A2-styled)
 *
 * Intent:
 * - Keep the existing, shallow-safe tickets fetch.
 * - Present the tickets in an A2-style layout matching the HTML mock:
 *   header + filter bar + grid-style table + right-hand details drawer.
 * - Preserve all existing test expectations and error/empty copy.
 */

import React, { useEffect, useState, useMemo } from 'react';

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

type ViewTicket = {
  raw: Ticket;
  key: string;
  timeShort: string;
  score: number;
  strengthIcon: '↑' | '→' | '↓';
  riskBucket: 'G' | 'A' | 'R';
  statusLabel: string;
  reasonCategory: string;
  reasonSummary: string;
  entry: string;
  stopTicks: string;
  targetTicks: string;
  contextLine: string;
};

function safeString(value: unknown): string {
  if (value === null || value === undefined) return '—';
  return String(value);
}

function deriveScore(id: string | number | undefined, symbol: string | undefined): number {
  const base = `${id ?? ''}-${symbol ?? ''}`;
  if (!base) return 70;
  const hash = Array.from(base).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return 60 + (hash % 40); // 60–99
}

function deriveStrength(score: number): '↑' | '→' | '↓' {
  if (score >= 85) return '↑';
  if (score <= 65) return '↓';
  return '→';
}

function deriveRisk(status?: string | null): 'G' | 'A' | 'R' {
  const s = (status ?? '').toUpperCase();
  if (s.includes('REJECT') || s.includes('BLOCK') || s.includes('RISK')) return 'R';
  if (s.includes('EXPIR') || s.includes('WARN') || s.includes('PENDING')) return 'A';
  return 'G';
}

function deriveTimeShort(openedAtUtc?: string): string {
  if (!openedAtUtc) return '—';
  const d = new Date(openedAtUtc);
  if (Number.isNaN(d.getTime())) return openedAtUtc; // preserve raw for weird values
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function mapToViewTicket(t: Ticket): ViewTicket {
  const symbol = safeString(t.symbol);
  const side = safeString(t.side);
  const strategy = safeString(t.strategy);
  const openedAtUtc = safeString(t.openedAtUtc);

  const score = deriveScore(t.id, t.symbol);
  const strengthIcon = deriveStrength(score);
  const riskBucket = deriveRisk(t.status);

  return {
    raw: t,
    key: safeString(t.id ?? openedAtUtc ?? `${symbol}-${strategy}`),
    timeShort: deriveTimeShort(t.openedAtUtc),
    score,
    strengthIcon,
    riskBucket,
    statusLabel: safeString(t.status || 'OPEN'),
    reasonCategory: '—', // backend not wired yet for detailed categories
    reasonSummary: 'Awaiting full audit pipeline wiring.',
    entry: '—',
    stopTicks: '—',
    targetTicks: '—',
    // IMPORTANT: keep these raw values present so existing tests still see them
    contextLine: [
      symbol !== '—' ? symbol : null,
      side !== '—' ? side : null,
      strategy !== '—' ? strategy : null,
      openedAtUtc !== '—' ? openedAtUtc : null,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

export default function TicketsPage() {
  const [state, setState] = useState<FetchState<Ticket[]>>({
    loading: true,
    error: null,
    data: null,
  });

  const [selectedId, setSelectedId] = useState<string | number | null>(null);

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

  const viewTickets = useMemo(() => tickets.map(mapToViewTicket), [tickets]);

  useEffect(() => {
    if (!hasTickets) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (!prev) return viewTickets[0]?.key ?? null;
      const stillExists = viewTickets.some((vt) => vt.key === String(prev));
      return stillExists ? prev : viewTickets[0]?.key ?? null;
    });
  }, [hasTickets, viewTickets]);

  const selectedTicket = useMemo(
    () =>
      viewTickets.find((vt) => vt.key === String(selectedId)) ??
      (viewTickets.length ? viewTickets[0] : null),
    [viewTickets, selectedId],
  );

  return (
    <section className="flex flex-col gap-4 text-[12px] text-[var(--text-secondary)]">
      {/* Page header – matches Tickets mock copy */}
      <header className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[var(--bg-header)] px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Tickets</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Full historical audit of signals, actions, rejections, expiries and downranks.
            </p>
          </div>
          <button
            type="button"
            className="hidden rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--border-accent)] hover:text-[var(--text-primary)] md:inline-flex"
          >
            Toggle Theme
          </button>
        </div>
      </header>

      {/* Filter bar – A2-style pill filters + search */}
      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[var(--bg-header)] px-6 py-3 text-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          {[
            'Date Range ▾',
            'Symbol ▾',
            'Strategy ▾',
            'Status ▾',
            'Reason Category ▾',
            'Score ≥ ▾',
            'Risk: All ▾',
          ].map((label) => (
            <button
              key={label}
              type="button"
              className="rounded-full border border-[rgba(255,255,255,0.14)] bg-[var(--bg-panel)] px-3 py-1 text-[11px] text-[var(--text-secondary)] hover:border-[var(--border-accent)] hover:text-[var(--text-primary)]"
            >
              {label}
            </button>
          ))}

          <div className="ml-auto flex items-center rounded-full border border-[rgba(255,255,255,0.12)] bg-[var(--bg-panel)] px-3 py-1">
            <span className="mr-2 text-[var(--text-muted)]">🔍</span>
            <input
              placeholder="Search notes, reasons…"
              className="bg-transparent text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      </section>

      {/* Main content: table + details drawer */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Tickets table panel */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[var(--bg-panel)]">
          {/* Panel header */}
          <div className="border-b border-[rgba(255,255,255,0.08)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]">
            TICKETS TABLE — FULL FEED (Signals, Actions, Rejections, Expiries, Downranks)
          </div>

          {/* Loading / error / empty states (strings preserved for tests) */}
          {state.loading && (
            <div className="px-4 py-4 text-sm text-[var(--text-secondary)]">
              Loading tickets…
            </div>
          )}

          {!state.loading && state.error && (
            <div className="px-4 py-4 text-sm text-red-300">{state.error}</div>
          )}

          {!state.loading && !state.error && !hasTickets && (
            <div className="px-4 py-4 text-sm text-[var(--text-secondary)]">
              No tickets returned for the current filters.
            </div>
          )}

          {!state.loading && !state.error && hasTickets && (
            <>
              {/* Header row – grid columns mirror HTML mock */}
              <div className="grid grid-cols-[80px,90px,60px,90px,64px,40px,64px,90px,140px,200px,90px,90px,90px,200px,160px,40px] border-b border-[rgba(255,255,255,0.08)] bg-[var(--bg-header)] px-4 py-2 text-[11px] font-medium text-[var(--text-secondary)]">
                <div>Time</div>
                <div>Symbol</div>
                <div>Side</div>
                <div>Strategy</div>
                <div className="text-right">Score</div>
                <div className="text-center">Str</div>
                <div className="text-center">Risk</div>
                <div className="text-center">Status</div>
                <div>Reason Category</div>
                <div>Reason Summary</div>
                <div className="text-right">Entry</div>
                <div className="text-right">Stop</div>
                <div className="text-right">Target</div>
                <div>Context</div>
                <div>Opened (UTC)</div>
                <div className="text-center">Sparkline</div>
                <div className="text-center">N</div>
              </div>

              {/* Rows */}
              <div className="max-h-[520px] overflow-auto">
                {viewTickets.map((vt, idx) => {
                  const isSelected = vt.key === String(selectedId);
                  const riskBg =
                    vt.riskBucket === 'G'
                      ? 'rgba(16,185,129,0.15)'
                      : vt.riskBucket === 'A'
                      ? 'rgba(251,191,36,0.15)'
                      : 'rgba(248,113,113,0.15)';
                  const riskColor =
                    vt.riskBucket === 'G'
                      ? '#6EE7B7'
                      : vt.riskBucket === 'A'
                      ? '#FBBF24'
                      : '#F97373';

                  let statusBg, statusColor, statusBorder;
                  switch (vt.statusLabel.toUpperCase()) {
                    case 'ACTIONED':
                    case 'ACTION':
                      statusBg = 'rgba(16,185,129,0.10)';
                      statusColor = '#6EE7B7';
                      statusBorder = 'rgba(16,185,129,0.40)';
                      break;
                    case 'REJECTED':
                      statusBg = 'rgba(248,113,113,0.10)';
                      statusColor = '#F97373';
                      statusBorder = 'rgba(248,113,113,0.40)';
                      break;
                    case 'EXPIRED':
                      statusBg = 'rgba(251,191,36,0.10)';
                      statusColor = '#FBBF24';
                      statusBorder = 'rgba(251,191,36,0.40)';
                      break;
                    default:
                      statusBg = 'rgba(148,163,184,0.10)';
                      statusColor = '#CBD5F5';
                      statusBorder = 'rgba(148,163,184,0.40)';
                      break;
                  }

                  const strengthColor =
                    vt.strengthIcon === '↑'
                      ? '#6EE7B7'
                      : vt.strengthIcon === '↓'
                      ? '#F97373'
                      : 'var(--text-secondary)';

                  return (
                    <button
                      key={vt.key || idx}
                      type="button"
                      onClick={() => setSelectedId(vt.key)}
                      className={[
                        'relative grid w-full cursor-pointer grid-cols-[80px,90px,60px,90px,64px,40px,64px,90px,140px,200px,90px,90px,90px,200px,160px,40px]',
                        'border-b border-[rgba(255,255,255,0.06)] px-4 py-2 text-left text-[12px] transition',
                        isSelected ? 'bg-white/10 shadow-[0_0_0_1px_rgba(66,226,244,0.55)]' : 'hover:bg-white/5',
                      ].join(' ')}
                    >
                      <div className="mono text-xs text-[var(--text-secondary)]">
                        {vt.timeShort}
                      </div>
                      <div className="text-center text-[11px] text-[var(--text-primary)]">
                        {safeString(vt.raw.symbol)}
                      </div>
                      <div className="text-center text-[11px] text-[var(--text-secondary)]">
                        {safeString(vt.raw.side)}
                      </div>
                      <div className="text-center text-[11px] text-[var(--text-primary)]">
                        {safeString(vt.raw.strategy)}
                      </div>
                      <div className="mono text-right text-xs text-[var(--text-primary)]">
                        {vt.score}
                      </div>
                      <div className="text-center" style={{ color: strengthColor }}>
                        {vt.strengthIcon}
                      </div>
                      <div className="text-center">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px]"
                          style={{ background: riskBg, color: riskColor }}
                        >
                          {vt.riskBucket}
                        </span>
                      </div>
                      <div className="text-center">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px]"
                          style={{
                            background: statusBg,
                            color: statusColor,
                            border: `1px solid ${statusBorder}`,
                          }}
                        >
                          {vt.statusLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {vt.reasonCategory}
                      </div>
                      <div className="truncate text-[11px] text-[var(--text-secondary)]">
                        {vt.reasonSummary}
                      </div>
                      <div className="mono text-right text-xs text-[var(--text-primary)]">
                        {vt.entry}
                      </div>
                      <div className="mono text-right text-xs text-[#F97373]">
                        {vt.stopTicks}
                      </div>
                      <div className="mono text-right text-xs text-[#10B981]">
                        {vt.targetTicks}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {/* IMPORTANT: raw values kept here so tests still see them */}
                        {vt.contextLine}
                      </div>
                      <div className="mono text-[11px] text-[var(--text-secondary)]">
                        {safeString(vt.raw.openedAtUtc)}
                      </div>
                      <div className="text-center text-[11px] text-[var(--text-secondary)]">
                        — {/* sparkline placeholder until wired */}
                      </div>
                      <div className="text-center text-[16px]" title="Notes">
                        📝
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Details drawer panel */}
        <aside className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[var(--bg-panel)] p-4 text-[11px] text-[var(--text-secondary)] lg:w-[380px]">
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
            DETAILS DRAWER — ON ROW CLICK
          </p>

          {selectedTicket ? (
            <div className="space-y-2">
              <div>
                <span className="font-semibold text-[var(--text-primary)]">
                  Strategy {safeString(selectedTicket.raw.strategy) || '—'}
                </span>{' '}
                · Symbol {safeString(selectedTicket.raw.symbol) || '—'} ·{' '}
                {selectedTicket.timeShort || safeString(selectedTicket.raw.openedAtUtc)}
              </div>

              <div>
                Status:{' '}
                <span style={{ color: '#6EE7B7' }}>{selectedTicket.statusLabel}</span> · Reason
                Category:{' '}
                <span style={{ color: '#FBBF24' }}>{selectedTicket.reasonCategory}</span>
              </div>

              <div>
                Reason:{' '}
                {selectedTicket.reasonSummary ||
                  'Awaiting full audit reason wiring from backend.'}
              </div>

              <hr className="my-2 border-[rgba(255,255,255,0.1)]" />

              <div className="mono">
                Entry: {selectedTicket.entry} · Stop: {selectedTicket.stopTicks} · Target:{' '}
                {selectedTicket.targetTicks} · R:R {selectedTicket.score >= 80 ? '2.1' : '1.4'} ·
                Contracts: 1
              </div>

              <hr className="my-2 border-[rgba(255,255,255,0.1)]" />

              <div className="mono">
                Score Breakdown: composite {selectedTicket.score} · (mock breakdown – pending
                real scoring feed)
              </div>

              <hr className="my-2 border-[rgba(255,255,255,0.1)]" />

              <div>
                Context: {selectedTicket.contextLine || 'No additional context available yet.'}
              </div>

              <hr className="my-2 border-[rgba(255,255,255,0.1)]" />

              <div>
                Config Snapshot:{' '}
                <button
                  type="button"
                  className="text-[11px] underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Open in Strategy Lab
                </button>
              </div>

              <div>Operator Notes</div>
              <textarea
                className="min-h-[80px] w-full rounded border border-[rgba(255,255,255,0.12)] bg-[var(--bg-shell)] p-2 text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                placeholder="Add notes or review commentary…"
              />
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)]">
              No tickets loaded yet — once data is available, click a row in the table to see its
              full audit trail here.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
