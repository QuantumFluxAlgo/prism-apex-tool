import React from 'react';
import type { Ticket } from '../lib/api';

function toText(t: Ticket) {
  return `${t.symbol} ${t.contract} ${t.side} x${t.qty} @ ${t.order.entry} | SL ${t.order.stop} | TP ${t.order.targets.join(', ')} | TIF ${t.order.tif}`;
}
function toCSV(t: Ticket) {
  return [
    ['symbol','contract','side','qty','entry','stop','targets','tif'].join(','),
    [t.symbol,t.contract,t.side,t.qty,t.order.entry,t.order.stop,t.order.targets.join('|'),t.order.tif].join(',')
  ].join('\n');
}

export function NextTicket({ ticket, block, reasons }: { ticket: Ticket | null; block: boolean; reasons: string[] }) {
  const disabled = block || !ticket;
  const copy = (fmt: 'text'|'csv'|'json') => {
    if (!ticket) return;
    const payload = fmt === 'text' ? toText(ticket) : fmt === 'csv' ? toCSV(ticket) : JSON.stringify(ticket, null, 2);
    navigator.clipboard.writeText(payload);
  };

  return (
    <div className="rounded-2xl shadow p-4 bg-white border">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Next Ticket</h2>
        {disabled ? (
          <span className="text-sm px-2 py-1 rounded bg-red-100 text-red-700">Copy blocked</span>
        ) : (
          <span className="text-sm px-2 py-1 rounded bg-green-100 text-green-700">Copy enabled</span>
        )}
      </div>
      <div className="mt-3 text-sm">
        {ticket ? (
          <>
            <div className="font-mono text-sm">
              {toText(ticket)}
            </div>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" onClick={() => copy('text')} disabled={disabled}>Copy Text</button>
              <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" onClick={() => copy('csv')} disabled={disabled}>Copy CSV</button>
              <button className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50" onClick={() => copy('json')} disabled={disabled}>Copy JSON</button>
            </div>
          </>
        ) : (
          <div className="text-gray-500">No valid signal right now.</div>
        )}
      </div>
      {reasons?.length > 0 && (
        <div className="mt-3 text-sm">
          <div className="font-semibold mb-1">Reasons:</div>
          <ul className="list-disc ml-6">
            {reasons.map((r, i) => <li key={i} className="text-red-700">{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

