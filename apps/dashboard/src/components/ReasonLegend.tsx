import React from 'react';
import Badge from '../ui/Badge';

const ITEMS: Array<[string, string]> = [
  ['RR below 1.1', 'Reward-to-risk ratio under 1.1 (won’t dispatch)'],
  ['RR above 1.9 cap', 'Exceeds program cap for R:R'],
  ['SHORT is view-only', 'Shorts are monitored but not actionable'],
  ['Missing R:R', 'Not enough data yet to compute R:R'],
  ['Not OPEN', 'Ticket already closed/complete'],
];

export default function ReasonLegend() {
  return (
    <div className="dashboard-legend">
      <div className="font-semibold">Reason legend</div>
      <div className="dashboard-legend__items">
        {ITEMS.map(([label, tip]) => (
          <span key={label} title={tip} className="flex items-center gap-1">
            <Badge tone="amber">{label}</Badge>
          </span>
        ))}
      </div>
    </div>
  );
}
