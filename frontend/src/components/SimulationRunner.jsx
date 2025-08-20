import React, { useState } from "react";

export default function SimulationRunner() {
  const [result, setResult] = useState(null);

  const runSim = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const res = await fetch("/api/simulate", { method: "POST", body: form });
    setResult(await res.json());
  };

  return (
    <div className="border rounded p-3">
      <h3 className="font-semibold">Dry-Run Simulator</h3>
      <form onSubmit={runSim} className="space-y-2">
        <input type="file" name="csv" accept=".csv" />
        <select name="strategy">
          <option value="ALL">ALL</option>
          <option value="ORB">ORB</option>
          <option value="VWAP">VWAP</option>
        </select>
        <button type="submit" className="px-3 py-1 border rounded">Run</button>
      </form>
      {result && (
        <div className="mt-4">
          <h4 className="font-semibold">Results</h4>
          <p>Tickets: {result.tickets.length}</p>
          <p>Breaches: {result.events.length}</p>
          <ul>
            {result.events.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
