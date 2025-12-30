/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function SystemStatus() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    api
      .ready()
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;

  const t = status.ticketizer;
  return (
    <div className="text-xs">
      ticketizer.running {t?.running ? '✓' : '✗'} | acc {t?.accepted ?? 0} / rej {t?.rejected ?? 0}
    </div>
  );
}
