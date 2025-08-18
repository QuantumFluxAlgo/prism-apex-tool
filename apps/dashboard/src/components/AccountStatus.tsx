import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Status {
  balance: number;
  drawdown: number;
  openPositions: number;
}

export function AccountStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    api.get('/account').then(setStatus).catch(() => {});
  }, []);

  if (!status) return <div className="bg-white p-4 shadow rounded">Loading...</div>;

  return (
    <div className="rounded bg-white p-4 shadow">
      <h2 className="mb-2 text-lg font-semibold">Account Status</h2>
      <p>Balance: ${status.balance}</p>
      <p>Drawdown: ${status.drawdown}</p>
      <p>Open Positions: {status.openPositions}</p>
    </div>
  );
}
