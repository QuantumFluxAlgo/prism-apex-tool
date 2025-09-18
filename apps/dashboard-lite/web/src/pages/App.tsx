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

export default function App() {
  // default to yesterday (UTC) so it matches the seeded file
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return yyyyMmDd(d);
  }, []);

  const [date, setDate] = useState<string>(yesterday);
  const [strategy, setStrategy] = useState<string>("APX-DDB-01");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fetchTickets() {
    setLoading(true);
    setErr(null);
    setTickets(null);
    try {
      // nginx in the dashboard-lite container proxies these to the API container
      const q = new URLSearchParams({ date, strategy });
      const res = await fetch(`/tickets?${q.toString()}`, { headers: { accept: "application/json" } });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const json = await res.json();
      if (!Array.isArray(json)) {
        throw new Error("Unexpected response (not an array)");
      }
      setTickets(json as Ticket[]);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  // auto-load on first render
  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <option value="APX-DDB-01">APX-DDB-01</option>
            {/* add more strategies here when available */}
          </select>
        </label>
        <button onClick={fetchTickets} disabled={loading} style={{ padding: "6px 12px", cursor: "pointer" }}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err && (
        <div style={{ color: "#b00020", marginBottom: 12 }}>Error: {err}</div>
      )}

      {tickets?.length ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Time (UTC)", "Symbol", "Side", "Qty", "Entry", "Stop", "Target", "RR", "Accepted"].map((header) => (
                <th key={header} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>
                  {header}
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
