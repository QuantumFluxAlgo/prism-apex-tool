import React, { useEffect, useMemo, useState } from "react";

type Ticket = {
  id: string;
  ts: string;
  strategy?: string;
  symbol: string;
  side: "Buy" | "Sell";
  qty: number;
  entry: { type: string; price: number };
  stop: { type: string; price: number; ticks?: number };
  targets: { type: string; price: number; ticks?: number; qty?: number }[];
  rr?: number;
  expiry?: string;
  notes?: string;
};

const strategies = ["APX-DDB-01","(other)"];

function ymdTodayUTC() {
  return new Date().toISOString().slice(0,10);
}

export default function App() {
  const [date, setDate] = useState(ymdTodayUTC());
  const [onlyDdb01, setOnlyDdb01] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ date });
    if (onlyDdb01) p.set("strategy", "APX-DDB-01");
    return p.toString();
  }, [date, onlyDdb01]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tickets?${qs}`)
      .then(r => r.json())
      .then(j => setTickets(Array.isArray(j) ? j : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [qs]);

  return (
    <div style={{ fontFamily: "Inter, system-ui, Arial", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Prism-Apex — Tickets (Lite)</h1>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <label>Date (UTC): <input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label><input type="checkbox" checked={onlyDdb01} onChange={e => setOnlyDdb01(e.target.checked)} /> Show only APX-DDB-01</label>
        <span style={{ color: "#666" }}>{loading ? "Loading…" : `${tickets.length} tickets`}</span>
      </div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}>
        {tickets.map(t => <TicketCard key={t.id} t={t} />)}
      </div>
    </div>
  );
}

function TicketCard({ t }: { t: Ticket }) {
  return (
    <div style={{ border: "1px solid #e4e4e7", borderRadius: 12, padding: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{t.symbol} — {t.side} × {t.qty}</div>
          <div style={{ fontSize: 12, color: "#666" }}>{new Date(t.ts).toISOString()}</div>
        </div>
        <div style={{ background: "#eef2ff", color: "#3730a3", borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
          {t.strategy || "—"}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 14 }}>
        <KV k="Entry" v={fmtPx(t.entry?.price)} />
        <KV k="Stop" v={fmtPx(t.stop?.price)} />
        <KV k="Target" v={fmtPx(t.targets?.[0]?.price)} />
        <KV k="RR" v={t.rr != null ? String(t.rr) : "—"} />
        <KV k="Expiry" v={t.expiry ? new Date(t.expiry).toISOString() : "—"} />
        <KV k="ID" v={t.id} />
      </div>
      {t.notes && <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>{t.notes}</div>}
    </div>
  );
}

function KV({k, v}:{k:string; v:string}) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3 }}>{k}</div>
      <div style={{ fontWeight: 600 }}>{v}</div>
    </div>
  );
}

function fmtPx(n?: number) {
  return (typeof n === "number" && Number.isFinite(n)) ? n.toFixed(2) : "—";
}
