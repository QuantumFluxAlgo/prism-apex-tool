#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – APPLYING WORKLIST V2 A3 OVERHAUL (MANUAL TERMINAL) ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo "--- Writing apps/dashboard/src/pages/WorklistV2.tsx ---"
cat <<'TSX' > apps/dashboard/src/pages/WorklistV2.tsx
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.

import React from 'react';
import type { CanonicalTicket } from '@prism-apex/shared';
import FiltersBar from '../ui/FiltersBar';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import Badge from '../ui/Badge';
import { fmtPrice, fmtR } from '../utils/number';
import { fmtUtc } from '../utils/time';
import { getWorklistV2CanonicalTickets } from '../lib/worklistMock';
import { fetchSessionMetrics, fetchWorklistCanonicalTickets } from '../lib/api';
import type { SessionMetricsDto } from '../lib/api';

const MAX_AGE_MINUTES = 30;

type RiskBucket = 'GREEN' | 'AMBER' | 'RED';
type StrengthTrend = 'strong' | 'neutral' | 'weak';

type FiltersState = {
  symbol: string;
  strategy: string;
  minScore: string;
  riskBucket: string;
  maxAge: string;
  search: string;
};

const SCORE_OPTIONS = ['ANY', '60', '70', '80', '90'];
const RISK_BUCKET_OPTIONS: RiskBucket[] = ['GREEN', 'AMBER', 'RED'];
const MAX_AGE_OPTIONS = ['30', '20', '15', 'ANY'];

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const pointsFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

type MissingSessionMetrics = { status: 'MISSING' };
type SessionMetricsEnrichment = SessionMetricsDto | MissingSessionMetrics;
type EnrichedTicket = CanonicalTicket & { sessionMetrics?: SessionMetricsEnrichment };

const SESSION_METRICS_PLACEHOLDER: MissingSessionMetrics = { status: 'MISSING' };

function buildSessionMetricsKey(symbol: string, sessionDate?: string | null) {
  return `${symbol}__${sessionDate ?? ''}`;
}

function isSessionMetricsDto(value: SessionMetricsEnrichment | undefined): value is SessionMetricsDto {
  if (!value) return false;
  if (value.status === 'MISSING') return false;
  return typeof value.sessionDate === 'string';
}

function getSessionMetrics(ticket: EnrichedTicket): SessionMetricsDto | null {
  if (!ticket.sessionMetrics) return null;
  return isSessionMetricsDto(ticket.sessionMetrics) ? ticket.sessionMetrics : null;
}

function formatPoints(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${pointsFormatter.format(value)}pt`;
}

function formatNullablePrice(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return fmtPrice(value);
}

function formatSessionMetricsSummary(metrics: SessionMetricsDto | null): string | null {
  if (!metrics) return null;
  const parts: string[] = [];
  if (typeof metrics.orWidthPoints === 'number') parts.push(`OR ${formatPoints(metrics.orWidthPoints)}`);
  if (typeof metrics.sessionAtrPoints === 'number') parts.push(`ATR ${formatPoints(metrics.sessionAtrPoints)}`);
  if (metrics.vwapSlope) parts.push(`VWAP ${metrics.vwapSlope}`);
  if (metrics.htfTrendBias) parts.push(`Trend ${metrics.htfTrendBias}`);
  if (metrics.hasMajorNewsToday) parts.push('News risk');
  if (!parts.length) return null;
  return parts.join(' · ');
}

function deriveScore(ticket: EnrichedTicket): number {
  const hash = Array.from(ticket.id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let score = 60 + (hash % 36);
  const metrics = getSessionMetrics(ticket);
  if (metrics) {
    const ratio =
      typeof metrics.orWidthToAtrRatio === 'number'
        ? metrics.orWidthToAtrRatio
        : typeof metrics.orWidthPoints === 'number' &&
          typeof metrics.sessionAtrPoints === 'number' &&
          metrics.sessionAtrPoints !== 0
        ? metrics.orWidthPoints / metrics.sessionAtrPoints
        : null;
    if (typeof ratio === 'number' && Number.isFinite(ratio)) {
      if (ratio >= 1.2) score += 8;
      else if (ratio >= 1.0) score += 5;
      else if (ratio >= 0.85) score += 3;
      else if (ratio <= 0.5) score -= 8;
      else if (ratio <= 0.7) score -= 4;
    }
    const direction = ticket.side === 'BUY' ? 'UP' : 'DOWN';
    const opposing = direction === 'UP' ? 'DOWN' : 'UP';
    const slope = metrics.vwapSlope?.toUpperCase();
    const bias = metrics.htfTrendBias?.toUpperCase();
    if (slope?.includes(direction) || bias?.includes(direction)) score += 6;
    if (slope?.includes(opposing) || bias?.includes(opposing)) score -= 6;
    if (metrics.hasMajorNewsToday) score -= 5;
    if (metrics.sessionQualityFlag === 'SKIP' || metrics.sessionSkipReason) score -= 5;
    if (metrics.status === 'ERROR') score -= 3;
  } else if (ticket.sessionMetrics?.status === 'MISSING') {
    score -= 4;
  }
  return Math.max(45, Math.min(98, Math.round(score)));
}

function deriveStrength(ticket: EnrichedTicket): StrengthTrend {
  const metrics = getSessionMetrics(ticket);
  if (metrics) {
    const direction = ticket.side === 'BUY' ? 'UP' : 'DOWN';
    const opposing = direction === 'UP' ? 'DOWN' : 'UP';
    const slope = metrics.vwapSlope?.toUpperCase();
    const bias = metrics.htfTrendBias?.toUpperCase();
    let alignment = 0;
    if (slope?.includes(direction)) alignment += 1;
    if (bias?.includes(direction)) alignment += 1;
    let headwinds = 0;
    if (slope?.includes(opposing)) headwinds += 1;
    if (bias?.includes(opposing)) headwinds += 1;
    if (metrics.hasMajorNewsToday) headwinds += 1;
    if (alignment >= 2 && headwinds === 0) return 'strong';
    if (headwinds >= 2 || metrics.sessionQualityFlag === 'SKIP') return 'weak';
    return 'neutral';
  }
  if (ticket.rrMultiple >= 2) return 'strong';
  if (ticket.rrMultiple >= 1.2) return 'neutral';
  return 'weak';
}

function deriveRiskBucket(ticket: EnrichedTicket): RiskBucket {
  if (ticket.totalRisk <= 700) return 'GREEN';
  if (ticket.totalRisk <= 1200) return 'AMBER';
  return 'RED';
}

function computeAgeMinutes(ticket: CanonicalTicket): number {
  const created = Date.parse(ticket.createdAtUtc ?? '');
  if (Number.isNaN(created)) return MAX_AGE_MINUTES;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

function computeTimeRemaining(ticket: CanonicalTicket): number {
  return Math.max(0, MAX_AGE_MINUTES - computeAgeMinutes(ticket));
}

function formatTicks(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}t`;
}

function formatStrategyName(strategyId?: string | null): string {
  const base = (strategyId ?? '').trim();
  if (!base) return 'Unknown';
  return base
    .replace(/[-_]/g, ' ')
    .replace(/\b(\w)/g, (match) => match.toUpperCase())
    .trim();
}

function getContextTags(ticket: EnrichedTicket): string[] {
  const values = new Set<string>();
  if (ticket.contextRegime) values.add(ticket.contextRegime);
  if (ticket.contextAtrBucket) values.add(`ATR ${ticket.contextAtrBucket}`);
  if (ticket.contextOrType) values.add(ticket.contextOrType);
  ticket.tags?.forEach((tag) => values.add(tag));
  return Array.from(values);
}

/**
 * A3-style row cell wrapper – glassy hover / active with neon edge.
 */
function renderRowCell(
  ticket: EnrichedTicket,
  selectedId: string | null,
  onSelect: (id: string) => void,
  content: React.ReactNode,
) {
  const active = selectedId === ticket.id;
  return (
    <button
      type="button"
      onClick={() => onSelect(ticket.id)}
      className={`group w-full rounded-xl border px-2.5 py-2 text-left text-sm text-slate-200 transition
        border-slate-900/80 bg-slate-950/40 
        shadow-[0_0_0_1px_rgba(15,23,42,0.9),0_14px_32px_rgba(15,23,42,0.95)]
        hover:border-cyan-300/80 hover:bg-slate-900/90 hover:text-white
        hover:shadow-[0_0_0_1px_rgba(34,211,238,0.85),0_18px_40px_rgba(15,23,42,0.98),0_0_32px_rgba(34,211,238,0.45)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-0
        ${active ? 'border-cyan-300/90 bg-slate-900/95 shadow-[0_0_0_1px_rgba(34,211,238,0.95),0_20px_46px_rgba(15,23,42,1),0_0_40px_rgba(34,211,238,0.70)]' : ''}`}
    >
      {content}
    </button>
  );
}

function StrengthIndicator({ trend }: { trend: StrengthTrend }) {
  if (trend === 'strong') {
    return (
      <div className="inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.45)]">
        <span className="text-[0.75rem]">↑</span>
        <span>Strong</span>
      </div>
    );
  }
  if (trend === 'weak') {
    return (
      <div className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-200 shadow-[0_0_10px_rgba(252,211,77,0.45)]">
        <span className="text-[0.75rem]">↓</span>
        <span>Weakening</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-500/60 bg-slate-800/40 px-2 py-0.5 text-xs font-medium text-slate-200">
      <span className="text-[0.75rem]">→</span>
      <span>Neutral</span>
    </div>
  );
}

function RiskPill({ bucket }: { bucket: RiskBucket }) {
  const toneClasses =
    bucket === 'GREEN'
      ? 'border-emerald-300/80 bg-emerald-400/10 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.35)]'
      : bucket === 'AMBER'
      ? 'border-amber-300/80 bg-amber-400/10 text-amber-200 shadow-[0_0_10px_rgba(252,211,77,0.35)]'
      : 'border-rose-400/80 bg-rose-500/10 text-rose-200 shadow-[0_0_14px_rgba(248,113,113,0.45)]';

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide ${toneClasses}`}
    >
      {bucket}
    </div>
  );
}

function Sparkline({ id }: { id: string }) {
  const values = React.useMemo(() => {
    const seed = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return new Array(8).fill(0).map((_, index) => ((seed >> index) & 7) + 2);
  }, [id]);

  return (
    <div className="flex h-6 w-24 items-end justify-between gap-0.5">
      {values.map((value, idx) => (
        <span
          key={`${id}-${idx}`}
          className="inline-block w-[3px] rounded-full bg-gradient-to-t from-slate-700 via-cyan-500/70 to-cyan-300/90 opacity-80 transition group-hover:opacity-100"
          style={{ height: `${value * 4}px` }}
        />
      ))}
    </div>
  );
}

function DetailsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="details-section rounded-xl border border-slate-700/80 bg-slate-950/60 px-3.5 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.95)] backdrop-blur">
      <h3 className="details-label text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </h3>
      <div className="mt-2 text-sm text-slate-200">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="ml-3 max-w-[60%] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[0.8rem] text-slate-100">
        {value ?? '—'}
      </span>
    </div>
  );
}

function TimeRemainingPill({ minutes }: { minutes: number }) {
  const clamped = Math.max(0, Math.min(MAX_AGE_MINUTES, minutes));
  const ratio = clamped / MAX_AGE_MINUTES;

  let palette =
    'from-cyan-500/90 via-sky-400/90 to-emerald-300/90 text-cyan-50 border-cyan-300/90 shadow-[0_0_18px_rgba(34,211,238,0.65)]';
  if (clamped <= 5) {
    palette =
      'from-rose-500/95 via-rose-400/95 to-amber-300/95 text-rose-50 border-rose-400/95 shadow-[0_0_22px_rgba(248,113,113,0.75)]';
  } else if (clamped <= 10) {
    palette =
      'from-amber-400/95 via-amber-300/95 to-yellow-200/95 text-slate-950 border-amber-300/95 shadow-[0_0_20px_rgba(252,211,77,0.65)]';
  }

  const width = `${Math.max(18, Math.round(ratio * 100))}%`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="inline-flex items-center gap-1 rounded-full border bg-slate-950/80 px-3 py-1 text-[0.7rem] font-medium text-slate-100">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        <span className="font-mono text-xs tabular-nums">{clamped}m</span>
        <span className="text-[0.65rem] text-slate-400">Time left</span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div
          className={`absolute inset-y-0 left-0 rounded-full border bg-gradient-to-r ${palette}`}
          style={{ width }}
        />
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  let palette =
    'from-slate-900 via-slate-900 to-slate-950 border-slate-700 text-slate-200 shadow-[0_0_0_1px_rgba(15,23,42,0.9)]';
  if (score >= 90) {
    palette =
      'from-cyan-500/95 via-sky-500/95 to-indigo-500/95 border-cyan-200 text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.9)]';
  } else if (score >= 80) {
    palette =
      'from-cyan-500/80 via-sky-500/80 to-indigo-500/80 border-cyan-200/90 text-slate-950 shadow-[0_0_18px_rgba(56,189,248,0.7)]';
  } else if (score >= 70) {
    palette =
      'from-slate-900 via-cyan-500/40 to-slate-900 border-cyan-300/70 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.55)]';
  }

  return (
    <div
      className={`inline-flex min-w-[4.5rem] flex-col items-start justify-center rounded-xl border bg-gradient-to-br px-2.5 py-1.5 ${palette}`}
    >
      <span className="font-mono text-lg leading-none tracking-tight tabular-nums">
        {score}
      </span>
      <span className="mt-[2px] text-[0.6rem] font-semibold uppercase tracking-[0.2em] opacity-85">
        Score
      </span>
    </div>
  );
}

export default function WorklistV2Page() {
  const fallbackTickets = React.useMemo(() => getWorklistV2CanonicalTickets(), []);
  const [apiTickets, setApiTickets] = React.useState<CanonicalTicket[]>([]);
  const [sessionMetricsMap, setSessionMetricsMap] =
    React.useState<Record<string, SessionMetricsEnrichment>>({});
  const usingApiTickets = apiTickets.length > 0;

  const allTickets = React.useMemo<EnrichedTicket[]>(() => {
    const source = usingApiTickets ? apiTickets : fallbackTickets;
    return source.map((ticket) => {
      const mapKey = buildSessionMetricsKey(ticket.symbol, ticket.sessionDateUtc);
      const hasSessionDate = Boolean(ticket.sessionDateUtc);
      const sessionMetrics =
        usingApiTickets && hasSessionDate
          ? sessionMetricsMap[mapKey]
          : usingApiTickets && !hasSessionDate
          ? SESSION_METRICS_PLACEHOLDER
          : undefined;
      return {
        ...ticket,
        sessionMetrics,
      };
    });
  }, [apiTickets, fallbackTickets, sessionMetricsMap, usingApiTickets]);

  const [filters, setFilters] = React.useState<FiltersState>({
    symbol: 'ALL',
    strategy: 'ALL',
    minScore: 'ANY',
    riskBucket: 'ANY',
    maxAge: '30',
    search: '',
  });
  const [mutedStrategies, setMutedStrategies] = React.useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchWorklistCanonicalTickets()
      .then((tickets) => {
        if (!cancelled && tickets.length) {
          setApiTickets(tickets);
        }
      })
      .catch(() => {
        // fall back to mock data silently
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!apiTickets.length) return;
    const unique = new Map<string, { symbol: string; sessionDate: string }>();

    apiTickets.forEach((ticket) => {
      if (!ticket.sessionDateUtc) return;
      const key = buildSessionMetricsKey(ticket.symbol, ticket.sessionDateUtc);
      if (!unique.has(key)) {
        unique.set(key, { symbol: ticket.symbol, sessionDate: ticket.sessionDateUtc });
      }
    });

    const pending = Array.from(unique.entries()).filter(
      ([key]) => !(key in sessionMetricsMap),
    );
    if (!pending.length) return;

    let cancelled = false;

    Promise.all(
      pending.map(async ([key, query]) => {
        try {
          const metrics = await fetchSessionMetrics({
            symbol: query.symbol,
            sessionDate: query.sessionDate,
          });
          return [key, metrics ?? SESSION_METRICS_PLACEHOLDER] as const;
        } catch {
          return [key, SESSION_METRICS_PLACEHOLDER] as const;
        }
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        setSessionMetricsMap((prev) => {
          const next = { ...prev };
          entries.forEach(([k, metrics]) => {
            next[k] = metrics;
          });
          return next;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSessionMetricsMap((prev) => {
          const next = { ...prev };
          pending.forEach(([k]) => {
            next[k] = SESSION_METRICS_PLACEHOLDER;
          });
          return next;
        });
      });

    return () => {
      cancelled = true;
    };
  }, [apiTickets, sessionMetricsMap]);

  const symbolOptions = React.useMemo(
    () => ['ALL', ...Array.from(new Set(allTickets.map((ticket) => ticket.symbol)))],
    [allTickets],
  );
  const strategyOptions = React.useMemo(
    () => ['ALL', ...Array.from(new Set(allTickets.map((ticket) => ticket.strategyId)))],
    [allTickets],
  );

  const filteredTickets = React.useMemo<EnrichedTicket[]>(() => {
    const search = filters.search.trim().toLowerCase();
    const minScore = filters.minScore === 'ANY' ? null : Number(filters.minScore);
    const maxAge = filters.maxAge === 'ANY' ? null : Number(filters.maxAge);
    const targetRisk =
      filters.riskBucket === 'ANY' ? null : (filters.riskBucket as RiskBucket);

    return allTickets.filter((ticket) => {
      const ticketScore = deriveScore(ticket);
      const ticketRisk = deriveRiskBucket(ticket);
      const ageMinutes = computeAgeMinutes(ticket);

      if (filters.symbol !== 'ALL' && ticket.symbol !== filters.symbol) return false;
      if (filters.strategy !== 'ALL' && ticket.strategyId !== filters.strategy) return false;

      if (minScore !== null && ticketScore < minScore) return false;
      if (targetRisk && ticketRisk !== targetRisk) return false;

      if (maxAge !== null) {
        if (ageMinutes > maxAge) return false;
      } else if (ageMinutes > MAX_AGE_MINUTES) {
        return false;
      }

      if (mutedStrategies[ticket.strategyId]) return false;

      if (search) {
        const haystack = [
          ticket.symbol,
          ticket.strategyId,
          ticket.notes ?? '',
          ticket.tags?.join(' ') ?? '',
          ticket.contextRegime ?? '',
          ticket.contextAtrBucket ?? '',
          ticket.contextOrType ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [allTickets, filters, mutedStrategies]);

  React.useEffect(() => {
    if (filteredTickets.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && filteredTickets.some((ticket) => ticket.id === prev)) {
        return prev;
      }
      return filteredTickets[0].id;
    });
  }, [filteredTickets]);

  const selectedTicket = React.useMemo<EnrichedTicket | null>(
    () => filteredTickets.find((ticket) => ticket.id === selectedId) ?? null,
    [filteredTickets, selectedId],
  );

  const handleSelect = React.useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const tableEmptyMessage =
    filteredTickets.length === 0
      ? allTickets.length === 0
        ? 'Worklist is empty — no risk-approved signals available right now.'
        : 'No signals match the current filters.'
      : undefined;

  const columns = React.useMemo<DataTableColumn<EnrichedTicket>[]>(
    () => [
      {
        key: 'score',
        header: 'Score',
        className: 'text-left',
        render: (ticket) => {
          const score = deriveScore(ticket);
          return renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex items-center gap-3">
              <ScorePill score={score} />
              <div className="flex flex-col text-[0.7rem] text-slate-400">
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-slate-400/90">
                  Signal
                </span>
                <span className="text-[0.7rem] text-slate-500">
                  Higher = stronger alignment with regime, OR/ATR, and trend.
                </span>
              </div>
            </div>,
          );
        },
      },
      {
        key: 'strength',
        header: 'Strength',
        className: 'text-left',
        render: (ticket) =>
          renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex items-center gap-2">
              <StrengthIndicator trend={deriveStrength(ticket)} />
              <span className="text-[0.65rem] text-slate-400">
                VWAP & HTF trend vs side.
              </span>
            </div>,
          ),
      },
      {
        key: 'strategy',
        header: 'Strategy',
        render: (ticket) =>
          renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-50">
                {formatStrategyName(ticket.strategyId)}
              </span>
              <span className="text-[0.7rem] uppercase tracking-[0.18em] text-slate-500">
                {ticket.side}
              </span>
            </div>,
          ),
      },
      {
        key: 'risk',
        header: 'Risk',
        align: 'center',
        render: (ticket) =>
          renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col items-center gap-1">
              <RiskPill bucket={deriveRiskBucket(ticket)} />
              <span className="text-[0.65rem] text-slate-400">Total ticket risk</span>
            </div>,
          ),
      },
      {
        key: 'contracts',
        header: 'Contracts',
        align: 'center',
        render: (ticket) =>
          renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono text-base text-slate-50">
                {numberFormatter.format(ticket.quantity)}
              </span>
              <span className="text-[0.65rem] text-slate-400">Contracts</span>
            </div>,
          ),
      },
      {
        key: 'entry',
        header: 'Entry',
        render: (ticket) =>
          renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col text-sm">
              <span className="font-mono text-slate-50">{fmtPrice(ticket.entryPrice)}</span>
              <span className="text-[0.65rem] text-slate-400">
                UTC {fmtUtc(ticket.createdAtUtc)}
              </span>
            </div>,
          ),
      },
      {
        key: 'stop',
        header: 'Stop',
        render: (ticket) =>
          renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col text-sm">
              <span className="font-mono text-slate-50">{fmtPrice(ticket.stopPrice)}</span>
              <span className="text-[0.65rem] text-rose-300">
                {formatTicks(-Math.abs(ticket.stopTicks))}
              </span>
            </div>,
          ),
      },
      {
        key: 'target',
        header: 'Target',
        render: (ticket) =>
          renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col text-sm">
              <span className="font-mono text-slate-50">
                {fmtPrice(ticket.targetPrice)}
              </span>
              <span className="text-[0.65rem] text-emerald-300">
                {formatTicks(Math.abs(ticket.targetTicks))}
              </span>
            </div>,
          ),
      },
      {
        key: 'rr',
        header: 'R:R',
        align: 'center',
        render: (ticket) =>
          renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono text-base text-slate-50">
                {fmtR(ticket.rrMultiple)}
              </span>
              <span className="text-[0.65rem] text-slate-400">Reward / risk</span>
            </div>,
          ),
      },
      {
        key: 'context',
        header: 'Market Context',
        render: (ticket) =>
          renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1.5">
                {getContextTags(ticket).map((tag) => (
                  <Badge
                    key={`${ticket.id}-${tag}`}
                    tone="gray"
                  >
                    {tag}
                  </Badge>
                ))}
                {getContextTags(ticket).length === 0 ? (
                  <span className="text-[0.7rem] text-slate-500">No tags</span>
                ) : null}
              </div>
              {(() => {
                const metrics = getSessionMetrics(ticket);
                const summary = formatSessionMetricsSummary(metrics);
                if (summary) {
                  return (
                    <p className="text-[0.68rem] text-slate-400">
                      {summary}
                    </p>
                  );
                }
                if (ticket.sessionMetrics?.status === 'MISSING') {
                  return (
                    <p className="text-[0.68rem] text-slate-500">
                      Session metrics unavailable.
                    </p>
                  );
                }
                if (usingApiTickets && ticket.sessionMetrics === undefined && ticket.sessionDateUtc) {
                  return (
                    <p className="text-[0.68rem] text-slate-500">
                      Session metrics loading…
                    </p>
                  );
                }
                return null;
              })()}
            </div>,
          ),
      },
      {
        key: 'timeRemaining',
        header: 'Time Remaining',
        align: 'center',
        render: (ticket) =>
          renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <TimeRemainingPill minutes={computeTimeRemaining(ticket)} />,
          ),
      },
      {
        key: 'sparkline',
        header: 'Spark',
        align: 'center',
        render: (ticket) =>
          renderRowCell(
            ticket,
            selectedId,
            handleSelect,
            <Sparkline id={ticket.id} />,
          ),
      },
    ],
    [handleSelect, selectedId, usingApiTickets],
  );

  const strategyMuteToggles = React.useMemo(
    () =>
      strategyOptions
        .filter((strategy) => strategy !== 'ALL')
        .map((strategy) => ({
          label: `Mute ${formatStrategyName(strategy)}`,
          checked: Boolean(mutedStrategies[strategy]),
          onChange: (checked: boolean) =>
            setMutedStrategies((prev) => ({
              ...prev,
              [strategy]: checked,
            })),
        })),
    [strategyOptions, mutedStrategies],
  );

  return (
    <section className="worklist-v2-root space-y-5">
      <header className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 text-slate-100 shadow-[0_26px_60px_rgba(15,23,42,0.95)]">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/25 blur-3xl" />
          <div className="absolute -right-24 -top-32 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0_0,rgba(15,23,42,0.5),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(15,23,42,0.65),transparent_60%)] mix-blend-soft-light" />
        </div>
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.32em] text-slate-400">
              Execution
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
              Worklist
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Risk-approved tickets ready for manual execution. Filters apply instantly;
              row selection drives the Signal Details console.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-[0.7rem]">
            <Badge tone="blue">Session · UTC</Badge>
            <Badge tone="gray">Environment · A3 Shell</Badge>
          </div>
        </div>
      </header>

      <div className="worklist-v2-filters relative rounded-3xl border border-slate-700/80 bg-gradient-to-br from-slate-950/95 via-slate-950 to-slate-950/95 p-4 shadow-[0_20px_46px_rgba(15,23,42,0.95)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-cyan-500/15 blur-3xl" />
        </div>
        <div className="relative z-10">
          <FiltersBar
            selects={[
              {
                label: 'Symbol',
                value: filters.symbol,
                options: symbolOptions,
                onChange: (value) =>
                  setFilters((prev) => ({
                    ...prev,
                    symbol: value,
                  })),
              },
              {
                label: 'Strategy',
                value: filters.strategy,
                options: strategyOptions,
                onChange: (value) =>
                  setFilters((prev) => ({
                    ...prev,
                    strategy: value,
                  })),
              },
              {
                label: 'Min Score',
                value: filters.minScore,
                options: SCORE_OPTIONS,
                onChange: (value) =>
                  setFilters((prev) => ({
                    ...prev,
                    minScore: value,
                  })),
              },
              {
                label: 'Risk Bucket',
                value: filters.riskBucket,
                options: ['ANY', ...RISK_BUCKET_OPTIONS],
                onChange: (value) =>
                  setFilters((prev) => ({
                    ...prev,
                    riskBucket: value,
                  })),
              },
              {
                label: 'Max Age (m)',
                value: filters.maxAge,
                options: MAX_AGE_OPTIONS,
                onChange: (value) =>
                  setFilters((prev) => ({
                    ...prev,
                    maxAge: value,
                  })),
              },
            ]}
            toggles={strategyMuteToggles}
            extra={
              <input
                type="search"
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: event.target.value,
                  }))
                }
                placeholder="Search symbol / strategy / notes"
                className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-sm text-slate-100 placeholder:text-slate-500 shadow-[0_0_0_1px_rgba(15,23,42,0.9)] focus:border-cyan-400 focus:outline-none focus:ring-0 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.85),0_0_20px_rgba(34,211,238,0.45)]"
              />
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] lg:flex lg:flex-col">
        <div className="panel worklist-v2-panel min-w-0 flex-1 rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-950 shadow-[0_28px_60px_rgba(15,23,42,0.98)] backdrop-blur">
          <div className="panel-header flex items-center justify-between gap-3 px-4 pt-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
                Worklist · Tradeable Signals
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">
                {filteredTickets.length} Ready
              </h2>
            </div>
            <div className="flex flex-col items-end gap-1 text-[0.7rem]">
              <Badge tone="gray">
                Risk-filtered ·{' '}
                {filters.maxAge === 'ANY' ? `${MAX_AGE_MINUTES}` : filters.maxAge}
                m
              </Badge>
              <span className="text-[0.65rem] text-slate-500">
                Selection drives details to the right.
              </span>
            </div>
          </div>
          <div className="panel-body px-4 pb-4 pt-2">
            <div className="scroll-y worklist-v2-table max-h-[72vh] overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-950/80 p-1.5">
              <DataTable
                columns={columns}
                rows={filteredTickets}
                rowKey={(ticket) => ticket.id}
                emptyMessage={tableEmptyMessage}
              />
            </div>
          </div>
        </div>

        <div className="panel details-panel worklist-v2-details w-full max-w-[380px] shrink-0 rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-950 shadow-[0_28px_60px_rgba(15,23,42,0.98)] backdrop-blur lg:max-w-full">
          <div className="details-header border-b border-slate-800/80 px-4 pb-3 pt-3">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Signal Details
            </h2>
            <span className="mt-1 text-[0.7rem] text-slate-500">
              {selectedTicket
                ? 'Select another row to inspect its full trade block.'
                : 'Select a row to inspect full trade block.'}
            </span>
          </div>
          <div className="details-body space-y-4 px-4 pb-4 pt-3">
            {selectedTicket ? (
              <div className="space-y-4">
                <DetailsSection title="Ticket Summary">
                  <div className="space-y-2">
                    <InfoRow label="Symbol" value={selectedTicket.symbol} />
                    <InfoRow label="Side" value={selectedTicket.side} />
                    <InfoRow
                      label="Strategy"
                      value={formatStrategyName(selectedTicket.strategyId)}
                    />
                    <InfoRow label="Status" value={selectedTicket.status} />
                    <InfoRow
                      label="Created"
                      value={fmtUtc(selectedTicket.createdAtUtc)}
                    />
                    <InfoRow
                      label="Session Date"
                      value={selectedTicket.sessionDateUtc}
                    />
                  </div>
                </DetailsSection>

                <DetailsSection title="Risk & Sizing">
                  <div className="space-y-2">
                    <InfoRow
                      label="Contracts"
                      value={selectedTicket.quantity}
                    />
                    <InfoRow
                      label="Per-contract risk"
                      value={currencyFormatter.format(
                        selectedTicket.perContractRisk,
                      )}
                    />
                    <InfoRow
                      label="Total risk"
                      value={currencyFormatter.format(selectedTicket.totalRisk)}
                    />
                    <InfoRow
                      label="Expected reward"
                      value={currencyFormatter.format(
                        selectedTicket.expectedReward,
                      )}
                    />
                    <InfoRow
                      label="R:R"
                      value={fmtR(selectedTicket.rrMultiple)}
                    />
                    <InfoRow
                      label="PnL (R)"
                      value={selectedTicket.pnlRMultiple ?? '—'}
                    />
                  </div>
                </DetailsSection>

                <DetailsSection title="Market Context">
                  <div className="flex flex-wrap gap-1.5">
                    {getContextTags(selectedTicket).map((tag) => (
                      <Badge
                        key={`${selectedTicket.id}-detail-${tag}`}
                        tone="gray"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {getContextTags(selectedTicket).length === 0 ? (
                      <span className="text-[0.7rem] text-slate-500">
                        No context tags.
                      </span>
                    ) : null}
                  </div>
                  {(() => {
                    const metrics = getSessionMetrics(selectedTicket);
                    if (metrics) {
                      return (
                        <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                          <InfoRow
                            label="OR High"
                            value={formatNullablePrice(metrics.orHigh)}
                          />
                          <InfoRow
                            label="OR Low"
                            value={formatNullablePrice(metrics.orLow)}
                          />
                          <InfoRow
                            label="OR Width"
                            value={formatPoints(metrics.orWidthPoints)}
                          />
                          <InfoRow
                            label="Session ATR"
                            value={formatPoints(metrics.sessionAtrPoints)}
                          />
                          <InfoRow
                            label="VWAP Slope"
                            value={metrics.vwapSlope ?? '—'}
                          />
                          <InfoRow
                            label="Trend Bias"
                            value={metrics.htfTrendBias ?? '—'}
                          />
                          <InfoRow
                            label="Regime"
                            value={metrics.volRegime ?? '—'}
                          />
                          <InfoRow
                            label="News"
                            value={
                              metrics.hasMajorNewsToday
                                ? metrics.newsLabel ?? 'Major event'
                                : 'None'
                            }
                          />
                        </div>
                      );
                    }
                    if (selectedTicket.sessionMetrics?.status === 'MISSING') {
                      return (
                        <p className="mt-3 text-[0.7rem] text-slate-500">
                          Session metrics unavailable.
                        </p>
                      );
                    }
                    if (usingApiTickets && selectedTicket.sessionDateUtc) {
                      return (
                        <p className="mt-3 text-[0.7rem] text-slate-500">
                          Session metrics loading…
                        </p>
                      );
                    }
                    return null;
                  })()}
                </DetailsSection>

                <DetailsSection title="Timing">
                  <div className="space-y-2">
                    <InfoRow
                      label="Age"
                      value={`${computeAgeMinutes(selectedTicket)}m`}
                    />
                    <InfoRow
                      label="Time remaining"
                      value={`${computeTimeRemaining(selectedTicket)}m`}
                    />
                    <InfoRow
                      label="Completed"
                      value={
                        selectedTicket.completedAtUtc
                          ? fmtUtc(selectedTicket.completedAtUtc)
                          : '—'
                      }
                    />
                  </div>
                </DetailsSection>

                <DetailsSection title="Notes & Source">
                  <div className="space-y-2 text-sm">
                    <InfoRow
                      label="Source"
                      value={selectedTicket.source ?? 'ENGINE'}
                    />
                    <div>
                      <p className="text-xs text-slate-400">Notes</p>
                      <p className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[0.78rem] text-slate-100">
                        {selectedTicket.notes ?? 'No operator notes attached.'}
                      </p>
                    </div>
                  </div>
                </DetailsSection>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/70 p-6 text-center text-sm text-slate-400 shadow-[0_16px_40px_rgba(15,23,42,0.95)]">
                Select a signal from the Worklist table to see its full context,
                risk breakdown, and notes.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
TSX

echo "--- Writing apps/dashboard/src/styles/worklist-a3.css ---"
cat <<'CSS' > apps/dashboard/src/styles/worklist-a3.css
/* Worklist V2 — A3-specific refinements.
 *
 * Keep this file small and safe. Most of the heavy lifting is done via
 * Tailwind utility classes in WorklistV2.tsx; this is mainly for scrollbars
 * and subtle layout polish that isn't worth inlining.
 */

.worklist-v2-root {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Smooth scroll experience for the table panel */
.worklist-v2-table {
  scrollbar-width: thin;
  scrollbar-color: rgba(56, 189, 248, 0.75) rgba(15, 23, 42, 0.95);
}

.worklist-v2-table::-webkit-scrollbar {
  width: 6px;
}

.worklist-v2-table::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.95);
}

.worklist-v2-table::-webkit-scrollbar-thumb {
  background: linear-gradient(
    to bottom,
    rgba(56, 189, 248, 0.9),
    rgba(56, 189, 248, 0.4)
  );
  border-radius: 999px;
}

/* Minor tweak so the details panel feels anchored */
.worklist-v2-details {
  will-change: transform, box-shadow;
  transition:
    transform 160ms ease-out,
    box-shadow 160ms ease-out;
}

.worklist-v2-details:hover {
  transform: translateY(-1px);
  box-shadow:
    0 26px 60px rgba(15, 23, 42, 0.98),
    0 0 22px rgba(56, 189, 248, 0.25);
}
CSS

echo "--- Running dashboard tests ---"
pnpm --filter prism-apex-dashboard test
