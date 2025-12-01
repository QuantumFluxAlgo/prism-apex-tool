#!/usr/bin/env bash
set -euo pipefail

cd ~/Projects/prism-apex-tool
cd "$(git rev-parse --show-toplevel)"

echo "=== PATCH: FiltersBar V2 – runtime hardening + V2 styling ==="

cat > apps/dashboard/src/ui/FiltersBar.tsx << 'TSX'
import React from 'react';

type FiltersBarSelectOption = {
  label: string;
  value: string;
};

type FiltersBarSelectConfig = {
  label: string;
  /** currently selected value */
  value: string;
  /** options can be proper objects or plain strings; we normalise at runtime */
  options: Array<FiltersBarSelectOption | string | null | undefined>;
  onChange: (value: string) => void;
};

type FiltersBarToggleConfig = {
  label: string;
  /** whether this toggle is currently active */
  value: boolean;
  onToggle: () => void;
};

type DateRangeConfig = {
  from: string;
  to: string;
  // keep this loose so existing call-sites (Reports, StrategyLab) stay happy
  onChange: (from: any, to: any) => void;
};

export type FiltersBarProps = {
  dateRange?: DateRangeConfig;
  selects?: FiltersBarSelectConfig[];
  toggles?: FiltersBarToggleConfig[];
  /** Extra inline content (chips, stats, etc.) */
  children?: React.ReactNode;
};

function normaliseOptions(
  options: Array<FiltersBarSelectOption | string | null | undefined>,
): FiltersBarSelectOption[] {
  return options
    .filter((opt) => opt !== null && opt !== undefined)
    .map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      const fallback = String(
        // @ts-expect-error – tolerate half-baked shapes at runtime
        (opt.value ?? opt.label ?? ''),
      );
      const label =
        // @ts-expect-error – defensive; we don't trust the shape
        typeof opt.label === 'string' && opt.label.trim().length > 0
          ? opt.label
          : fallback || '—';
      const value =
        // @ts-expect-error – defensive
        typeof opt.value === 'string' && opt.value.trim().length > 0
          ? opt.value
          : fallback;
      return { label, value };
    });
}

export default function FiltersBar(props: FiltersBarProps) {
  const { dateRange, selects, toggles, children } = props;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/70 px-4 py-3 text-xs text-slate-200 shadow-[0_0_0_1px_rgba(15,23,42,0.9)]">
      <div className="flex flex-wrap items-center gap-3">
        {dateRange && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Date range
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="h-8 rounded-lg border border-slate-700 bg-slate-900/80 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
                value={dateRange.from}
                onChange={(e) => dateRange.onChange(e.target.value, dateRange.to)}
              />
              <span className="text-[10px] text-slate-500">to</span>
              <input
                type="date"
                className="h-8 rounded-lg border border-slate-700 bg-slate-900/80 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
                value={dateRange.to}
                onChange={(e) => dateRange.onChange(dateRange.from, e.target.value)}
              />
            </div>
          </div>
        )}

        {selects?.map((select) => {
          const opts = normaliseOptions(select.options);
          return (
            <div key={select.label} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {select.label}
              </span>
              <select
                className="h-8 min-w-[7rem] rounded-lg border border-slate-700 bg-slate-900/80 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
                value={select.value}
                onChange={(e) => select.onChange(e.target.value)}
              >
                {opts.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}

        {toggles?.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {toggles.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={t.onToggle}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition
                  ${
                    t.value
                      ? 'border-cyan-400/80 bg-cyan-400/15 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                      : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-cyan-400/60 hover:text-cyan-50'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        {children && (
          <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
            {children}
          </div>
        )}
      </div>
    </div>
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
echo "=== PATCH COMPLETE – FiltersBar hardened; check /worklist-v2, /tickets, /market-data and browser console. ==="
