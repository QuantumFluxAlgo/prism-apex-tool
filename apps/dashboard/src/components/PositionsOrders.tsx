import React, { useEffect, useState } from 'react';
import { Market, type Position, type Order } from '../lib/api';

export function PositionsOrders() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    async function run() {
      try {
        const [p, o] = await Promise.all([Market.positions(), Market.orders()]);
        if (!live) return;
        setPositions(p);
        setOrders(o);
      } finally {
        setLoading(false);
      }
    }
    run();
    const id = setInterval(run, 5000);
    return () => { live = false; clearInterval(id); };
  }, []);

  const missingBrackets = orders.some(o => o.status === 'WORKING') && !orders.some(o => o.ocoGroupId);

  return (
    <div className="rounded-2xl shadow p-4 bg-white border">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Positions & Orders</h2>
        {missingBrackets && (
          <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">
            HARD PAUSE: Missing OCO brackets detected
          </span>
        )}
      </div>

      {loading ? <div className="text-gray-500 mt-2">Loading…</div> : (
        <>
          <div className="mt-3">
            <div className="font-semibold text-sm mb-1">Positions</div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-600">
                <th className="py-1">Symbol</th><th>Qty</th><th>Avg</th><th>Unrealized</th>
              </tr></thead>
              <tbody>
                {positions.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1">{p.symbol}</td>
                    <td>{p.qty}</td>
                    <td className="font-mono">{p.avgPrice?.toFixed?.(2) ?? p.avgPrice}</td>
                    <td className={`font-mono ${p.unrealizedPnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>{p.unrealizedPnl?.toFixed?.(2) ?? p.unrealizedPnl}</td>
                  </tr>
                ))}
                {!positions.length && <tr><td className="py-2 text-gray-500" colSpan={4}>No positions</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <div className="font-semibold text-sm mb-1">Orders</div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-600">
                <th className="py-1">ID</th><th>Symbol</th><th>Side</th><th>Type</th><th>Limit</th><th>Stop</th><th>Status</th>
              </tr></thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1">{o.id}</td>
                    <td>{o.symbol}</td>
                    <td>{o.side}</td>
                    <td>{o.type}</td>
                    <td className="font-mono">{o.limitPrice ?? '-'}</td>
                    <td className="font-mono">{o.stopPrice ?? '-'}</td>
                    <td>{o.status}</td>
                  </tr>
                ))}
                {!orders.length && <tr><td className="py-2 text-gray-500" colSpan={7}>No orders</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

