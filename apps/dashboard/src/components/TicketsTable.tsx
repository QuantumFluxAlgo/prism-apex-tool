import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Ticket {
  symbol: string;
  side: string;
  entry: number;
  stop: number;
  target: number;
  time: string;
}

export function TicketsTable() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    api.get('/tickets').then(setTickets).catch(() => {});
  }, []);

  return (
    <div className="bg-white shadow rounded p-4">
      <h2 className="mb-2 text-lg font-semibold">Trade Tickets</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Symbol</th>
            <th>Side</th>
            <th>Entry</th>
            <th>Stop</th>
            <th>Target</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t, i) => (
            <tr key={i} className="border-t">
              <td>{t.symbol}</td>
              <td>{t.side}</td>
              <td>{t.entry}</td>
              <td>{t.stop}</td>
              <td>{t.target}</td>
              <td>{t.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
