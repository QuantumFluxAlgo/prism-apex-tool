import React from 'react';
import Badge from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { useSymbolSpecs } from '../hooks/useSymbolSpecs';

type SymbolCoverageProps = {
  rows?: unknown[];
  className?: string;
};

export function SymbolCoverage({ rows: _rows, className }: SymbolCoverageProps = {}) {
  const { data, error, verified, total } = useSymbolSpecs();

  if (error) {
    return <span className="text-sm text-red-600">Tick specs unavailable</span>;
  }

  if (!data) {
    return <span className="text-sm text-gray-400">Loading tick specs…</span>;
  }

  const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
  const unverifiedSymbols = data.filter((spec) => !spec.tickSpecVerified).map((spec) => spec.symbol);
  const tone = pct === 100 ? 'green' : 'amber';
  const tooltipLabel =
    unverifiedSymbols.length > 0
      ? `Unverified: ${unverifiedSymbols.join(', ')}`
      : 'All tracked symbols verified';

  const badge = (
    <Tooltip text={tooltipLabel}>
      <Badge tone={tone} className={className ?? ''}>
        Tick Specs: {verified}/{total} ({pct}%)
      </Badge>
    </Tooltip>
  );

  return badge;
}
