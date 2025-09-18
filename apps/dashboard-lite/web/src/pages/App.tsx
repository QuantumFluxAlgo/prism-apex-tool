import { useEffect, useMemo, useState } from "react";

type Ticket = {
  symbol: string;
  side: "BUY" | "SELL" | string;
  entry: number;
  stop: number;
  target: number;
  qty: number;
  accountId: string;
  timestampUtc: string;
  meta?: { strategy?: string; rr?: number; guardrails?: unknown[] };
  accepted?: boolean;
  reasons?: string[];
  hash?: string;
};

function yyyyMmDd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const REFRESH_MS = 10000;

export default function App() {
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return yyyyMmDd(d);
  }, []);

  const [date, setDate] = useState<string>(defaultDate);
  const [strategy, setStrategy] = useState<string>("ORR");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [last, setLast] = useState<string>("");

  async function fetchTickets(signal?: AbortSignal) {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams({ date, strategy });
      const res = await fetch(`/tickets?${q.toString()}`, {
        headers: { accept: "application/json" },
        signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error("Unexpected response (not an array)");
      setTickets(json as Ticket[]);
      setLast(new Date().toLocaleTimeString());
    } catch (e: any) {
      if (e?.name !== "AbortError") setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    fetchTickets(ac.signal);
    return () => ac.abort();
  }, [date, strategy]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => fetchTickets(), REFRESH_MS);
    return () => clearInterval(id);
  }, [auto, date, strategy]);

  return (
    <div
      style={{
        padding: "24px",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 40, margin: 0, marginBottom: 8 }}>Prism-Apex — Dashboard Lite</h1>
      <p style={{ color: "#333", marginTop: 0 }}>
        Read-only tickets feed. Use the date picker and strategy toggle to filter.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <label>
          Date:&nbsp;
          <input
            type="date"
            value={date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
          />
        </label>
        <label>
          Strategy:&nbsp;
          <select
            value={strategy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStrategy(e.target.value)}
          >
            <option value="ORR">Open Range Retest (ORR)</option>
          </select>
        </label>
        <button onClick={() => fetchTickets()} disabled={loading} style={{ padding: "6px 12px", cursor: "pointer" }}>
          {loading ? "Loading…" : "Refresh"}
        </button>
        <label style={{ marginLeft: 8 }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.currentTarget.checked)} />
          &nbsp;Auto refresh (10s)
        </label>
        <span style={{ opacity: 0.7, marginLeft: 8 }}>{last && `Last update: ${last}`}</span>
      </div>

      {err && <div style={{ color: "#b00020", marginBottom: 12 }}>Error: {err}</div>}

      {tickets?.length ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Time (UTC)", "Symbol", "Side", "Qty", "Entry", "Stop", "Target", "RR", "Accepted"].map((h) => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.hash ?? `${t.symbol}-${t.timestampUtc}-${t.side}-${t.entry}`}>
                <td style={{ padding: "6px" }}>{t.timestampUtc}</td>
                <td style={{ padding: "6px" }}>{t.symbol}</td>
                <td style={{ padding: "6px" }}>{t.side}</td>
                <td style={{ padding: "6px" }}>{t.qty}</td>
                <td style={{ padding: "6px" }}>{t.entry}</td>
                <td style={{ padding: "6px" }}>{t.stop}</td>
                <td style={{ padding: "6px" }}>{t.target}</td>
                <td style={{ padding: "6px" }}>{t.meta?.rr ?? ""}</td>
                <td style={{ padding: "6px" }}>{t.accepted ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        !loading && !err && <div>No tickets found for {date} / {strategy}.</div>
      )}
    </div>
  );
}
