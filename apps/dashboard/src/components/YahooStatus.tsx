/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';

type Row = { symbol: string; minutes_behind: number; last_bar_utc?: string };
type Health = { status: string; rows: Row[]; now_utc?: string; ok_lag_min?: number; degraded_lag_min?: number };

const STATUS_LABELS: Record<string, { text: string; detail: string }> = {
  ok: { text: 'Live', detail: 'All symbols under lag threshold' },
  degraded: { text: 'Delays', detail: 'Some symbols are catching up' },
  down: { text: 'Unavailable', detail: 'Ingress stalled or failing' },
  paused: { text: 'Session paused', detail: 'Weekend/holiday — waiting for market open' },
};

export default function YahooStatus() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/health/yahoo');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setHealth(json);
      } catch (_err) {
        setHealth({ status: 'down', rows: [] });
      }
    }
    fetchHealth();
    const t = setInterval(fetchHealth, 60_000);
    return () => clearInterval(t);
  }, []);

  if (!health) return null;
  const meta = STATUS_LABELS[health.status] ?? { text: health.status, detail: '' };
  const color =
    health.status === 'ok'
      ? 'bg-green-500'
      : health.status === 'degraded'
      ? 'bg-amber-500'
      : health.status === 'paused'
      ? 'bg-blue-500'
      : 'bg-red-500';

  return (
    <div className={`flex flex-col gap-1 text-white text-sm px-4 py-2 rounded-2xl shadow-lg ${color}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold">Yahoo Ingress</span>
        <span className="text-xs uppercase tracking-wide">{meta.text}</span>
      </div>
      {meta.detail && <span className="text-xs opacity-90">{meta.detail}</span>}
    </div>
  );
}
