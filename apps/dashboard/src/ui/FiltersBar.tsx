import React from 'react';

type DateRangeConfig = {
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
};

type SelectConfig = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

type ToggleConfig = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

type FiltersBarProps = {
  dateRange?: DateRangeConfig;
  selects?: SelectConfig[];
  toggles?: ToggleConfig[];
  children?: React.ReactNode;
};

export default function FiltersBar({ dateRange, selects = [], toggles = [], children }: FiltersBarProps = {}) {
  const hasDynamicContent = Boolean(dateRange || selects.length || toggles.length || children);

  if (!hasDynamicContent) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-3 dark:border-zinc-800">
        <span className="text-xs text-gray-500">UTC (GMT)</span>
        <input
          type="date"
          className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          type="date"
          className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
          <option>All Symbols</option>
          <option>ES=F</option>
          <option>NQ=F</option>
          <option>GC=F</option>
          <option>CL=F</option>
        </select>
        <select className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
          <option>All Strategies</option>
          <option>ORR</option>
        </select>
        <select className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
          <option>Any Status</option>
          <option>OPEN</option>
          <option>CLOSED</option>
          <option>COMPLETE</option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-3 text-sm dark:border-zinc-800">
      <span className="text-xs uppercase tracking-wide text-gray-500">UTC (GMT)</span>
      {dateRange && (
        <>
          <input
            type="date"
            value={dateRange.from ?? ''}
            onChange={(event) => dateRange.onChange(event.target.value || undefined, dateRange.to)}
            className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            type="date"
            value={dateRange.to ?? ''}
            onChange={(event) => dateRange.onChange(dateRange.from, event.target.value || undefined)}
            className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </>
      )}

      {selects.map((select) => (
        <label key={select.label} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="uppercase">{select.label}</span>
          <select
            value={select.value}
            onChange={(event) => select.onChange(event.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200"
          >
            {select.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}

      {toggles.map((toggle) => (
        <label
          key={toggle.label}
          className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-zinc-700 dark:text-gray-300"
        >
          <input
            type="checkbox"
            checked={toggle.checked}
            onChange={(event) => toggle.onChange(event.target.checked)}
            className="h-3 w-3 accent-blue-500"
          />
          {toggle.label}
        </label>
      ))}

      {children}
    </div>
  );
}
