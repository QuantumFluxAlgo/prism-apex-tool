import React from 'react';

interface WarningsListProps {
  warnings?: string[];
}

export const WarningsList: React.FC<WarningsListProps> = ({ warnings }) => {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="rounded-md border border-amber-400/60 bg-amber-50/20 px-3 py-2 text-xs text-amber-200">
      <p className="font-semibold uppercase tracking-wide">Warnings</p>
      <ul className="ml-4 list-disc space-y-0.5">
        {warnings.map((warning, idx) => (
          <li key={idx}>{warning}</li>
        ))}
      </ul>
    </div>
  );
};
