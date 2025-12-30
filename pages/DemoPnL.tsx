import React from 'react';
import { WorklistPnLCell } from '../components/WorklistPnLCell';
import Badge from '../ui/Badge';

const DEMO_ROWS = [
  {
    label: 'ES=F LONG (target above entry)',
    symbol: 'ES=F',
    entry: 5000,
    target: 5005,
    stop: 4999,
    direction: 'LONG' as const,
  },
  {
    label: 'ES=F SHORT (target below entry)',
    symbol: 'ES=F',
    entry: 5000,
    target: 4995,
    stop: 5001,
    direction: 'SHORT' as const,
  },
  {
    label: '^GDAXI (unverified — grey-out)',
    symbol: '^GDAXI',
    entry: 18000,
    target: 18010,
    stop: 17990,
    direction: 'LONG' as const,
  },
];

export default function DemoPnL() {
  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Demo: Worklist PnL Cell</h1>
        <p className="text-sm text-gray-600">
          Use this page to review the per-contract PnL helper with verified versus unverified specs.
        </p>
      </header>
      <div className="grid gap-4">
        {DEMO_ROWS.map((row, index) => (
          <section key={index} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-900">{row.label}</h2>
              <Badge tone="gray">{row.symbol}</Badge>
            </div>
            <p className="mb-3 text-xs text-gray-500">
              entry={row.entry} · target={row.target} · stop={row.stop} · direction={row.direction}
            </p>
            <WorklistPnLCell
              symbol={row.symbol}
              entry={row.entry}
              target={row.target}
              stop={row.stop}
              direction={row.direction}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
