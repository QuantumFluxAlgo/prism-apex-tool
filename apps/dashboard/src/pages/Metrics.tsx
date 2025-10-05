import React from 'react';
import MetricsCard from '../components/MetricsCard';

type Metrics = {
  bars: Record<string, number>;
  tickets: { total: number | null; today: number | null };
  lastIngestUtc: string | null;
  dbConnected: boolean;
};

export default function MetricsPage() {
  const [data, setData] = React.useState<Metrics | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/metrics', { headers: { accept: 'application/json' } });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const j = await r.json();
        setData(j);
      } catch (e: any) {
        setError(e?.message ?? 'fetch failed');
      }
    })();
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Metrics</h1>
      <MetricsCard data={data} error={error} />
    </div>
  );
}
