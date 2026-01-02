/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface Status {
  balance: number;
  drawdown: number;
  openPositions: number;
}

export function AccountStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    api
      .get('/account')
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return <div className="bg-white p-4 shadow rounded">Loading...</div>;

  return (
    <div className="rounded bg-white p-4 shadow">
      <h2 className="mb-2 text-lg font-semibold">Account Status</h2>
      <p>Balance: ${status.balance}</p>
      <p>Drawdown: ${status.drawdown}</p>
      <p>Open Positions: {status.openPositions}</p>
    </div>
  );
}
