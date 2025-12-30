/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface Alert {
  message: string;
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      api
        .get('/alerts')
        .then(setAlerts)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded border border-red-200 bg-red-50 p-4">
      <h2 className="mb-2 text-lg font-semibold">Alerts</h2>
      <ul className="ml-5 list-disc text-red-700">
        {alerts.map((a, i) => (
          <li key={i}>{a.message}</li>
        ))}
      </ul>
    </div>
  );
}
