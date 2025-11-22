import React from 'react';
import type { TicketQualityFilterState } from '../../types/ticketQualityFilters';

type Props = {
  value: TicketQualityFilterState;
  onChange: (next: TicketQualityFilterState) => void;
  onApply?: (filters: TicketQualityFilterState) => void;
  onClear?: () => void;
};

const FIELD_CONFIGS: Array<{
  key: keyof TicketQualityFilterState;
  label: string;
  step: number;
}> = [
  { key: 'minEntryRR', label: 'Min Entry RR', step: 0.1 },
  { key: 'maxEntryRR', label: 'Max Entry RR', step: 0.1 },
  { key: 'minActualRR', label: 'Min Actual RR', step: 0.1 },
  { key: 'maxActualRR', label: 'Max Actual RR', step: 0.1 },
  { key: 'minRiskDollars', label: 'Min Risk $', step: 10 },
  { key: 'maxRiskDollars', label: 'Max Risk $', step: 10 },
  { key: 'minActualPnLDollars', label: 'Min Actual PnL $', step: 10 },
  { key: 'maxActualPnLDollars', label: 'Max Actual PnL $', step: 10 },
];

function normaliseNumber(value: number | '' | undefined): number | undefined {
  if (value === '' || value === undefined) return undefined;
  return Number.isFinite(value) ? value : undefined;
}

function normaliseFilters(filters: TicketQualityFilterState): TicketQualityFilterState {
  return {
    minEntryRR: normaliseNumber(filters.minEntryRR),
    maxEntryRR: normaliseNumber(filters.maxEntryRR),
    minActualRR: normaliseNumber(filters.minActualRR),
    maxActualRR: normaliseNumber(filters.maxActualRR),
    minRiskDollars: normaliseNumber(filters.minRiskDollars),
    maxRiskDollars: normaliseNumber(filters.maxRiskDollars),
    minActualPnLDollars: normaliseNumber(filters.minActualPnLDollars),
    maxActualPnLDollars: normaliseNumber(filters.maxActualPnLDollars),
  };
}

export const TicketQualityFilterBar: React.FC<Props> = ({ value, onChange, onApply, onClear }) => {
  const handleInputChange =
    (key: keyof TicketQualityFilterState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (raw === '') {
        onChange({ ...value, [key]: '' });
        return;
      }
      const parsed = Number(raw);
      if (Number.isNaN(parsed)) return;
      onChange({ ...value, [key]: parsed });
    };

  const handleApply = () => {
    if (!onApply) return;
    onApply(normaliseFilters(value));
  };

  const handleClear = () => {
    onChange({});
    onClear?.();
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.5rem',
        alignItems: 'end',
        marginBottom: '1rem',
      }}
    >
      {FIELD_CONFIGS.map((field) => {
        const inputId = `ticket-quality-${String(field.key)}`;
        return (
          <div key={field.key}>
            <label
              htmlFor={inputId}
              style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}
            >
              {field.label}
            </label>
            <input
              id={inputId}
              type="number"
              step={field.step}
              value={value[field.key] ?? ''}
              onChange={handleInputChange(field.key)}
              style={{ width: '100%' }}
            />
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" onClick={handleClear}>
          Clear
        </button>
        <button type="button" onClick={handleApply}>
          Apply
        </button>
      </div>
    </div>
  );
};
