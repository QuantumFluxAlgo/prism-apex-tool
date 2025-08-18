import { describe, expect, it } from 'vitest';
import { toDailyCSV } from '../csv';
import { sendDailyEmail } from '../email';
import type { DailyJson } from '../types';

describe('reporting utils', () => {
  it('formats CSV and dry-run email', async () => {
    const json: DailyJson = {
      summary: {
        date: '2025-08-17',
        ticketsCount: 1,
        blockedCount: 0,
        alertsAcked: 0,
        alertsQueued: 0,
        pnl: { realized: 1, unrealized: 0, netLiq: 1000 },
      },
      tickets: [{
        when: '2025-08-17T14:00:00.000Z',
        symbol: 'ES',
        side: 'BUY',
        qty: 1,
        entry: 5000,
        stop: 4995,
        targets: [5005],
        apex_blocked: false,
        reasons: [],
      }],
      alerts: [],
      breaches: [],
    };
    const csv = toDailyCSV(json);
    expect(csv).toContain('date,time,symbol');
    const res = await sendDailyEmail(json.summary.date, 'ops@example.com', json, csv);
    expect(res.transport).toBe('dry-run');
    expect(res.preview).toContain('TO: ops@example.com');
  });
});
