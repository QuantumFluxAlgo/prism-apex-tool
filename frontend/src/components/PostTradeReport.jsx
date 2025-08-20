import React, { useEffect, useState } from "react";

export default function PostTradeReport() {
  const [report, setReport] = useState(null);
  const [payout, setPayout] = useState(null);

  useEffect(() => {
    fetch("/api/analytics/daily")
      .then((r) => r.json())
      .then(setReport);
    fetch("/api/analytics/payout")
      .then((r) => r.json())
      .then(setPayout);
  }, []);

  if (!report || !payout) return <p>Loading...</p>;

  const progress = Math.min(
    (payout.cumulative_pnl / payout.threshold) * 100,
    100
  );

  return (
    <div className="p-4 bg-white shadow rounded-xl">
      <h2 className="text-xl font-bold mb-2">Daily Post-Trade Report</h2>
      <p>Gross PnL: {report.pnl.gross}</p>
      <p>Net PnL: {report.pnl.net}</p>
      <h3 className="font-semibold">Breaches</h3>
      <ul>
        {report.breaches.map((b, i) => (
          <li key={i} className="text-red-600">
            {b.type}: {b.details}
          </li>
        ))}
      </ul>
      <h3 className="font-semibold">Operator Actions</h3>
      <table className="w-full text-left">
        <tbody>
          {report.operator_actions.map((a, i) => (
            <tr key={i}>
              <td className="pr-2">{a.type}</td>
              <td>{JSON.stringify(a)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="font-semibold mt-4">Payout Progress</h3>
      <div className="w-full bg-gray-200 rounded">
        <div
          className="bg-green-500 text-xs leading-none py-1 text-center text-white rounded"
          style={{ width: `${progress}%` }}
        >
          {progress.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
