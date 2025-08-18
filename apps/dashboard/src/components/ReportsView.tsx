import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Report {
  win_rate: number;
  avg_r: number;
  max_dd: number;
  rule_breaches: number;
}

export function ReportsView() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    api.get('/reports').then(setReport).catch(() => {});
  }, []);

  if (!report) return <div className="bg-white p-4 shadow rounded">Loading...</div>;

  return (
    <div className="rounded bg-white p-4 shadow">
      <h2 className="mb-2 text-lg font-semibold">Reports</h2>
      <p>Win Rate: {Math.round(report.win_rate * 100)}%</p>
      <p>Avg R: {report.avg_r.toFixed(2)}</p>
      <p>Max DD: {report.max_dd}</p>
      <p>Rule Breaches: {report.rule_breaches}</p>
    </div>
  );
}
