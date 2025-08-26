import React from 'react';

type Position = {
  contract: string;
  symbolRoot: string;
  qty: number;
  avgPrice: number;
  unrealizedPnL?: number;
};

export function PositionsTable({ positions, updatedAt }: { positions: Position[]; updatedAt: string }) {
  return (
    <table className="min-w-full bg-white">
      <thead>
        <tr>
          <th className="px-2 py-1">Time</th>
          <th className="px-2 py-1">Contract</th>
          <th className="px-2 py-1">Side</th>
          <th className="px-2 py-1">Qty</th>
          <th className="px-2 py-1">Avg Price</th>
          <th className="px-2 py-1">Last</th>
          <th className="px-2 py-1">Unrealized PnL</th>
        </tr>
      </thead>
      <tbody>
        {positions.map((p) => (
          <tr key={p.contract} className="text-center">
            <td className="border px-2 py-1">{updatedAt ? new Date(updatedAt).toLocaleTimeString() : '—'}</td>
            <td className="border px-2 py-1">{p.contract}</td>
            <td className="border px-2 py-1">{p.qty >= 0 ? 'LONG' : 'SHORT'}</td>
            <td className="border px-2 py-1">{p.qty}</td>
            <td className="border px-2 py-1">{p.avgPrice}</td>
            <td className="border px-2 py-1">—</td>
            <td className="border px-2 py-1">{p.unrealizedPnL ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default PositionsTable;
