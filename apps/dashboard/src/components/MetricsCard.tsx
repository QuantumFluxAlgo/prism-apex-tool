import React from 'react';

type Metrics = {
  bars: Record<string, number>;
  tickets: { total: number | null; today: number | null };
  lastIngestUtc: string | null;
  dbConnected: boolean;
};

export const MetricsCard: React.FC<{ data: Metrics | null; error?: string | null }> = ({ data, error }) => {
  if (error) return <div className="p-4 rounded-xl shadow bg-red-50 border border-red-200">Error: {error}</div>;
  if (!data) return <div className="p-4 rounded-xl shadow bg-white border">Loading…</div>;

  const bars = Object.entries(data.bars || {}).sort(([a],[b]) => a.localeCompare(b));

  return (
    <div className="p-4 rounded-2xl shadow bg-white border space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">System Metrics</h2>
        <span className={"text-sm px-2 py-1 rounded " + (data.dbConnected ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800")}>
          DB: {data.dbConnected ? "connected" : "not connected"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 rounded-xl bg-gray-50">
          <div className="text-sm text-gray-500">Tickets (total)</div>
          <div className="text-2xl font-bold">{data.tickets.total ?? "—"}</div>
        </div>
        <div className="p-3 rounded-xl bg-gray-50">
          <div className="text-sm text-gray-500">Tickets (today)</div>
          <div className="text-2xl font-bold">{data.tickets.today ?? "—"}</div>
        </div>
        <div className="p-3 rounded-xl bg-gray-50">
          <div className="text-sm text-gray-500">Last Ingest (UTC)</div>
          <div className="text-md">{data.lastIngestUtc ?? "—"}</div>
        </div>
      </div>

      <div>
        <div className="text-sm text-gray-500 mb-2">Bars per symbol</div>
        {bars.length === 0 ? (
          <div className="text-gray-600">No bars recorded yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {bars.map(([sym, n]) => (
              <div key={sym} className="px-3 py-2 rounded-lg bg-gray-50 border">
                <div className="text-xs text-gray-500">{sym}</div>
                <div className="font-semibold">{n}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default MetricsCard;
