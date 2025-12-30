import React from 'react';

type EnumOption<T extends string> = {
  value: T;
  label: string;
};

interface EnumSelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: EnumOption<T>[];
  helpText?: string;
  error?: string;
}

export function EnumSelect<T extends string>({ label, value, onChange, options, helpText, error }: EnumSelectProps<T>) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helpText && !error && <p className="text-[11px] text-slate-400">{helpText}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
