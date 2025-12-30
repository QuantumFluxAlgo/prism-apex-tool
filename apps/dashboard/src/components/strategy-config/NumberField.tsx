import React from 'react';

type NumberValue = number | '';

interface NumberFieldProps {
  label: string;
  value: NumberValue;
  onChange: (value: NumberValue) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  helpText?: string;
  error?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  helpText,
  error,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (raw === '') {
      onChange('');
      return;
    }
    const parsed = Number(raw);
    onChange(Number.isNaN(parsed) ? '' : parsed);
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-300">{label}</label>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {helpText && !error && <p className="text-[11px] text-slate-400">{helpText}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
};
