import React, { useEffect, useState } from 'react';

type Row = { symbol: string; minutes_behind: number };
type Health = { status: string; rows: Row[] };

export default function YahooStatus() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/health/yahoo');
        const json = await res.json();
        setHealth(json);
      } catch {
        setHealth({ status: 'down', rows: [] });
      }
    }
    fetchHealth();
    const t = setInterval(fetchHealth, 300000);
    return () => clearInterval(t);
  }, []);

  if (!health) return null;
  const color =
    health.status === 'ok'
      ? 'bg-green-500'
      : health.status === 'degraded'
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <div className={`flex items-center gap-2 text-white text-sm px-3 py-1 rounded-full ${color}`}>
      <span>Yahoo: {health.status}</span>
    </div>
  );
}
