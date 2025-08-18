import React from 'react';
import type { ComplianceSnapshot } from '../lib/api';

export function ComplianceStrip({ data }: { data: ComplianceSnapshot | null }) {
  const Badge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
      {label}: {ok ? 'OK' : 'BLOCK'}
    </span>
  );

  if (!data) return (
    <div className="flex gap-2 flex-wrap">
      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Loading compliance…</span>
    </div>
  );

  const eodWarn = data.eodState === 'BLOCK_NEW';
  return (
    <div className="flex gap-2 flex-wrap items-center">
      <Badge ok={data.stopRequired} label="Stop" />
      <Badge ok={data.rrLeq5} label="R:R ≤ 5" />
      <Badge ok={data.ddHeadroom} label="DD Headroom" />
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${typeof data.halfSize === 'string' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
        {typeof data.halfSize === 'string' ? data.halfSize : 'Sizing OK'}
      </span>
      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
        Consistency: WARN≥{Math.round(data.consistencyPolicy.warnAt * 100)}% FAIL≥{Math.round(data.consistencyPolicy.failAt * 100)}%
      </span>
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${eodWarn ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
        EOD: {eodWarn ? 'BLOCK (T-5)' : 'OK'}
      </span>
    </div>
  );
}

