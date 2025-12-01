#!/usr/bin/env bash
set -euo pipefail

cd ~/Projects/prism-apex-tool
cd "$(git rev-parse --show-toplevel)"

echo "=== PATCH: FiltersBar – add 'extra' prop and right-aligned slot ==="

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
  checked: boolean;
  /** called with next checked state */
  onChange: (checked: boolean) => void;
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
  /** Inline extra content near the filters (chips, stats, etc.) */
  children?: React.ReactNode;
  /** Right-aligned content cluster (e.g., summary, legends) */
  extra?: React.ReactNode;
};

function normaliseOptions(
  options: Array<FiltersBarSelectOption | string | null | undefined>,
): FiltersBarSelectOption[] {
  return options
    .filter(
      (opt): opt is FiltersBarSelectOption | string =>
        opt !== null && opt !== undefined,
    )
    .map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }

      const anyOpt = opt as any;
      const fallback = String(anyOpt.value ?? anyOpt.label ?? '');
      const label =
        typeof anyOpt.label === 'string' && anyOpt.label.trim().length > 0
          ? anyOpt.label
          : fallback || '—';
      const value =
        typeof anyOpt.value === 'string' && anyOpt.value.trim().length > 0
          ? anyOpt.value
          : fallback;

      return { label, value };
    });
}

export default function FiltersBar(props: FiltersBarProps) {
  const { dateRange, selects, toggles, children, extra } = props;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/70 px-4 py-3 text-xs text-slate-200 shadow-[0_0_0_1px_rgba(15,23,42,0.9)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
                  onClick={() => t.onChange(!t.checked)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition
                    ${
                      t.checked
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
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
              {children}
            </div>
          )}
        </div>

        {extra && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
            {extra}
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
echo "=== PATCH COMPLETE – FiltersBar.extra wired; WorklistV2 should now typecheck. ==="
