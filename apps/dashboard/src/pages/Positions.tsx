import { useEffect, useState } from 'react';
import PositionsTable from '../components/PositionsTable.js';
import { fetchPositions, fetchAccount } from '../lib/telemetry.js';

export default function PositionsPage() {
  const accountId = 'A1';
  const [positions, setPositions] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [bufferCleared, setBufferCleared] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [intervalMs, setIntervalMs] = useState(5000);

  async function load() {
    const pos = await fetchPositions(accountId);
    setPositions(pos);
    const acct = await fetchAccount(accountId);
    if (acct) {
      setBalance(acct.balance);
      setBufferCleared(!!acct.bufferCleared);
    }
    setUpdatedAt(new Date().toISOString());
  }

  useEffect(() => {
    let t: any;
    load();
    if (intervalMs > 0) t = setInterval(load, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);

  return (
    <div>
      <div className="flex items-center space-x-4 mb-4">
        <div>Account Balance: {balance.toFixed(2)}</div>
        <div>Buffer Cleared: {bufferCleared ? '✓' : '✗'}</div>
        <div>Positions Count: {positions.length}</div>
        <label>
          Refresh:
          <select
            aria-label="Refresh"
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
            className="ml-2 border"
          >
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={0}>Off</option>
          </select>
        </label>
      </div>
      <PositionsTable positions={positions} updatedAt={updatedAt} />
    </div>
  );
}
