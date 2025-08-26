import { copyText } from '../lib/copy';

export interface Ticket {
  symbol: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  target: number;
  qty: number;
  accountId: string;
  timestampUtc: string;
  meta: { strategy: 'VWAP_FT' | 'OSB'; rr: number; guardrails: string[] };
  accepted: boolean;
  reasons?: string[];
}

interface Props {
  tickets: Ticket[];
  hasMore: boolean;
  onLoadMore: () => void;
}

function orderBlock(t: Ticket) {
  const rr = t.meta.rr.toFixed(2);
  return `${t.symbol} ${t.side} ${t.qty} @ ${t.entry.toFixed(2)} | SL ${t.stop.toFixed(2)} | TP ${t.target.toFixed(2)} | RR ${rr}`;
}

export function TicketsTable({ tickets, hasMore, onLoadMore }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <p>No tickets. Check <a href="/ready" className="underline">/ready</a>?</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded p-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Time</th>
            <th>Symbol</th>
            <th>Side</th>
            <th>Entry</th>
            <th>Stop</th>
            <th>Target</th>
            <th>RR</th>
            <th>Qty</th>
            <th>Strategy</th>
            <th>Accepted</th>
            <th>Copy</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t, idx) => (
            <tr key={`${t.symbol}-${t.timestampUtc}-${idx}`} className="border-t">
              <td>{new Date(t.timestampUtc).toLocaleTimeString()}</td>
              <td>{t.symbol}</td>
              <td>{t.side}</td>
              <td>{t.entry}</td>
              <td>{t.stop}</td>
              <td>{t.target}</td>
              <td>{t.meta.rr.toFixed(2)}</td>
              <td>{t.qty}</td>
              <td>{t.meta.strategy}</td>
              <td title={t.accepted ? '' : (t.reasons || []).join(', ')}>
                {t.accepted ? '✓' : '✗'}
              </td>
              <td className="relative">
                <details>
                  <summary className="cursor-pointer">Copy</summary>
                  <div className="absolute z-10 bg-white border p-1 text-xs flex flex-col">
                    <button onClick={() => copyText(t.entry.toString())}>Entry</button>
                    <button onClick={() => copyText(t.stop.toString())}>Stop</button>
                    <button onClick={() => copyText(t.target.toString())}>Target</button>
                    <button onClick={() => copyText(t.qty.toString())}>Qty</button>
                    <button onClick={() => copyText(orderBlock(t))}>Order Block</button>
                  </div>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="px-2 py-1 bg-gray-200 rounded"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
