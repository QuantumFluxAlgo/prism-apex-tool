import React from 'react';

export function DailyRiskBars({ lossPct, consistencyShare }: { lossPct: number; consistencyShare: number }) {
  const lossColor = lossPct < 50 ? 'bg-green-500' : lossPct < 75 ? 'bg-amber-500' : lossPct < 90 ? 'bg-orange-600' : 'bg-red-600';
  const consColor = consistencyShare < 25 ? 'bg-green-500' : consistencyShare < 30 ? 'bg-amber-500' : 'bg-red-600';

  return (
    <div className="rounded-2xl shadow p-4 bg-white border">
      <h2 className="text-lg font-semibold mb-2">Daily Risk</h2>
      <div className="text-sm mb-1">Daily Loss</div>
      <div className="w-full bg-gray-100 rounded h-2 mb-3">
        <div className={`h-2 rounded ${lossColor}`} style={{ width: `${Math.min(100, Math.max(0, lossPct))}%` }} />
      </div>
      <div className="text-sm mb-1">Consistency Share</div>
      <div className="w-full bg-gray-100 rounded h-2">
        <div className={`h-2 rounded ${consColor}`} style={{ width: `${Math.min(100, Math.max(0, consistencyShare))}%` }} />
      </div>
      <div className="mt-2 text-xs text-gray-600">Amber at 25% consistency, Red at 30%.</div>
    </div>
  );
}

