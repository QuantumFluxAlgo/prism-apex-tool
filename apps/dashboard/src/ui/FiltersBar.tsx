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
      <div className="dashboard-filters">
        <span>UTC (GMT)</span>
        <input type="date" />
        <input type="date" />
        <select>
          <option>All Symbols</option>
          <option>ES=F</option>
          <option>NQ=F</option>
          <option>GC=F</option>
          <option>CL=F</option>
        </select>
        <select>
          <option>All Strategies</option>
          <option>ORR</option>
        </select>
        <select>
          <option>Any Status</option>
          <option>OPEN</option>
          <option>CLOSED</option>
          <option>COMPLETE</option>
        </select>
      </div>
    );
  }

  return (
    <div className="dashboard-filters">
      <span>UTC (GMT)</span>
      {dateRange && (
        <>
          <input
            type="date"
            value={dateRange.from ?? ''}
            onChange={(event) => dateRange.onChange(event.target.value || undefined, dateRange.to)}
          />
          <input
            type="date"
            value={dateRange.to ?? ''}
            onChange={(event) => dateRange.onChange(dateRange.from, event.target.value || undefined)}
          />
        </>
      )}

      {selects.map((select) => (
        <label key={select.label}>
          <span>{select.label}</span>
          <select value={select.value} onChange={(event) => select.onChange(event.target.value)}>
            {select.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}

      {toggles.map((toggle) => (
        <label key={toggle.label} className="dashboard-toggle">
          <input type="checkbox" checked={toggle.checked} onChange={(event) => toggle.onChange(event.target.checked)} />
          {toggle.label}
        </label>
      ))}

      {children}
    </div>
  );
}
