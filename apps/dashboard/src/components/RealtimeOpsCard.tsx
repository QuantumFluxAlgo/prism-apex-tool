import React, { useEffect, useState } from "react";

type HB = { ts: string; ageSec: number } | null;
type StatusPayload = {
  status: "green" | "amber" | "red";
  now: string;
  bars: { maxTs: string | null; perKey: Record<string,string|null>; ageSec: number | null };
  tickets: { maxCreatedTs: string | null; openedToday: number; createdToday: number; ageSec: number | null };
  heartbeats: { gapfill: HB; tickets: HB };
};

export default function RealtimeOpsCard() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function fetchStatus() {
    try {
      const r = await fetch("/api/ops/status");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j); setErr(null);
    } catch (e:any) { setErr(e.message); }
  }

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 30000);
    return () => clearInterval(t);
  }, []);

  const dot = (lvl?:string) => {
    const c = lvl==="green" ? "bg-green-500" : lvl==="amber" ? "bg-yellow-500" : "bg-red-500";
    return <span className={`inline-block w-3 h-3 rounded-full ${c}`} />;
  };

  const age = (n?:number|null) => n==null ? "—" : `${n}s`;

  return (
    <div className="rounded-2xl shadow p-4 border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Realtime Health</h3>
        <div className="flex items-center gap-2">{dot(data?.status)} <span className="text-sm">{data?.status ?? "…"}</span></div>
      </div>
      {err && <div className="text-red-600 text-sm mt-2">Error: {err}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div className="p-3 rounded-xl bg-gray-50">
          <div className="text-sm text-gray-500">Bars freshness</div>
          <div className="text-sm">Max: {data?.bars.maxTs ?? "—"}</div>
          <div className="text-sm">Age: {age(data?.bars.ageSec)}</div>
          <div className="text-xs mt-1 opacity-80">
            {data && Object.entries(data.bars.perKey).map(([k,v]) => <div key={k}>{k}: {v ?? "—"}</div>)}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-gray-50">
          <div className="text-sm text-gray-500">Tickets freshness</div>
          <div className="text-sm">Latest: {data?.tickets.maxCreatedTs ?? "—"}</div>
          <div className="text-sm">Age: {age(data?.tickets.ageSec)}</div>
          <div className="text-sm">Today: {data?.tickets.createdToday ?? 0} created · {data?.tickets.openedToday ?? 0} opened</div>
        </div>
        <div className="p-3 rounded-xl bg-gray-50">
          <div className="text-sm text-gray-500">Heartbeats</div>
          <div className="text-sm">Gapfill: {data?.heartbeats.gapfill?.ts ?? "—"} ({age(data?.heartbeats.gapfill?.ageSec)})</div>
          <div className="text-sm">Tickets: {data?.heartbeats.tickets?.ts ?? "—"} ({age(data?.heartbeats.tickets?.ageSec)})</div>
        </div>
        <div className="p-3 rounded-xl bg-gray-50">
          <div className="text-sm text-gray-500">Now (UTC)</div>
          <div className="text-sm">{data?.now ?? "…"}</div>
        </div>
      </div>
    </div>
  );
}
