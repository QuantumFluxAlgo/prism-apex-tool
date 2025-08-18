import React from 'react';

type Props = { netLiq: number | null; ddLine: number | null };

export function EquityDrawdownGauge({ netLiq, ddLine }: Props) {
  const ok = netLiq != null && ddLine != null && netLiq > ddLine;
  const dist = netLiq != null && ddLine != null ? (netLiq - ddLine) : null;

  return (
    <div className="rounded-2xl shadow p-4 bg-white border">
      <h2 className="text-lg font-semibold mb-2">Equity / DD</h2>
      <div className="text-sm">
        <div>Net Liq: <span className="font-mono">{netLiq != null ? netLiq.toFixed(2) : '—'}</span></div>
        <div>DD Line: <span className="font-mono">{ddLine != null ? ddLine.toFixed(2) : '—'}</span></div>
        <div className={`mt-2 inline-block px-2 py-1 rounded ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {dist != null ? (ok ? `Headroom: ${dist.toFixed(2)}` : `BREACH RISK: ${(-dist).toFixed(2)}`) : 'No data'}
        </div>
      </div>
    </div>
  );
}

