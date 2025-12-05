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
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--apex-card-border)] bg-[var(--apex-surface-muted)] px-4 py-3 text-xs text-[var(--apex-text)] shadow-[0_16px_40px_rgba(8,12,24,0.65)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {dateRange && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--apex-text-muted)]">
                Date range
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="h-8 rounded-lg border border-[var(--apex-input-border)] bg-[var(--apex-input-bg)] px-2 text-xs text-[var(--apex-text)] outline-none focus:border-[var(--apex-input-border-hover)] focus:ring-1 focus:ring-[var(--apex-focus-ring)]"
                  value={dateRange.from}
                  onChange={(e) => dateRange.onChange(e.target.value, dateRange.to)}
                />
                <span className="text-[10px] text-[var(--apex-text-muted)]">to</span>
                <input
                  type="date"
                  className="h-8 rounded-lg border border-[var(--apex-input-border)] bg-[var(--apex-input-bg)] px-2 text-xs text-[var(--apex-text)] outline-none focus:border-[var(--apex-input-border-hover)] focus:ring-1 focus:ring-[var(--apex-focus-ring)]"
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
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--apex-text-muted)]">
                  {select.label}
                </span>
                <select
                  className="h-8 min-w-[7rem] rounded-lg border border-[var(--apex-input-border)] bg-[var(--apex-input-bg)] px-2 text-xs text-[var(--apex-text)] outline-none focus:border-[var(--apex-input-border-hover)] focus:ring-1 focus:ring-[var(--apex-focus-ring)]"
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
                        ? 'border-[var(--apex-tab-active-border)] bg-[var(--apex-tab-active-bg)] text-[var(--apex-tab-active-text)] shadow-[var(--apex-tab-active-shadow)]'
                        : 'border-[var(--apex-toggle-border)] bg-[var(--apex-toggle-bg)] text-[var(--apex-text-muted)] hover:border-[var(--apex-tab-hover-border)] hover:text-[var(--apex-text)]'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : null}

          {children && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--apex-text)]">
              {children}
            </div>
          )}
        </div>

        {extra && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--apex-text)]">
            {extra}
          </div>
        )}
      </div>
    </div>
  );
}
