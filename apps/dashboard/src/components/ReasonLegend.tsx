import React from 'react';
import Badge from '../ui/Badge';

const ITEMS: Array<[string, string]> = [
  ['RR below 2.0', 'Reward-to-risk ratio under 2.0 (won’t dispatch)'],
  ['RR above 4.5 cap', 'Exceeds program cap for R:R'],
  ['SHORT is view-only', 'Shorts are monitored but not actionable'],
  ['Missing R:R', 'Not enough data yet to compute R:R'],
  ['Not OPEN', 'Ticket already closed/complete'],
];

export default function ReasonLegend() {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <div className="mb-1 font-semibold text-amber-100">Reason legend</div>
      <div className="flex flex-wrap gap-2">
        {ITEMS.map(([label, tip]) => (
          <span key={label} title={tip} className="flex items-center gap-1">
            <Badge tone="amber">{label}</Badge>
          </span>
        ))}
      </div>
    </div>
  );
}
