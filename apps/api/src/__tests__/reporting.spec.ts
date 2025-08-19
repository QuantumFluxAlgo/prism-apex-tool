import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
let buildServer: any;
let store: typeof import('../store').store;

// Mock env for Tradovate client
beforeEach(async () => {
  vi.resetModules();
  process.env.TRADOVATE_BASE_URL = 'https://example.test/v1';
  process.env.TRADOVATE_USERNAME = 'u';
  process.env.TRADOVATE_PASSWORD = 'p';
  process.env.TRADOVATE_CLIENT_ID = 'cid';
  process.env.TRADOVATE_CLIENT_SECRET = 'sec';
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'report-'));
  const mod = await import('../server');
  buildServer = mod.buildServer;
  store = (await import('../store')).store;
  vi.useRealTimers();
});

function mockFetchSequence(responses: { status: number; json: any }[]) {
  let i = 0;
  (globalThis as any).fetch = vi.fn(async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.json,
    } as Response;
  });
}

describe('Reporting exports', () => {
  it('exports daily JSON and CSV and supports email dry-run', async () => {
    const date = '2030-01-01';
    // Seed store via direct appendTicket + enqueueAlert
    const now1 = `${date}T14:10:00.000Z`;
    store.appendTicket({
      when: now1,
      ticket: {
        id: 't1',
        symbol: 'ES',
        contract: 'ESU5',
        side: 'BUY',
        qty: 1,
        order: { type: 'LIMIT', entry: 5000, stop: 4995, targets: [5005], tif: 'DAY', oco: true },
        risk: { perTradeUsd: 5, rMultipleByTarget: [1] },
        apex: { stopRequired: true, rrLeq5: true, ddHeadroom: true, halfSize: true, eodReady: true, consistency30: 'OK' },
      },
      reasons: [],
    });

    const now2 = `${date}T15:30:00.000Z`;
    store.appendTicket({
      when: now2,
      ticket: {
        id: 't2',
        symbol: 'NQ',
        contract: 'NQU5',
        side: 'SELL',
        qty: 1,
        order: { type: 'LIMIT', entry: 18000, stop: 18010, targets: [17990], tif: 'DAY', oco: true },
        risk: { perTradeUsd: 10, rMultipleByTarget: [1] },
        apex: { stopRequired: true, rrLeq5: true, ddHeadroom: true, halfSize: true, eodReady: true, consistency30: 'OK' },
      },
      reasons: ['Half-size until buffer'],
    });

    (store as any).enqueueAlert({
      alert: { id: 'a1', ts: `${date}T14:00:00.000Z`, symbol: 'ES', side: 'BUY', price: 5000, reason: 'VWAP', raw: {} },
      human: { id: 'a1', text: 'ES BUY @ 5000 — VWAP' },
    });

    // Mock Tradovate account
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } },
      { status: 200, json: { netLiq: 52050, cash: 52050, margin: 0, dayPnlRealized: 150.25, dayPnlUnrealized: -25.5 } }, // account for daily.json
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } },
      { status: 200, json: { netLiq: 52050, cash: 52050, margin: 0, dayPnlRealized: 150.25, dayPnlUnrealized: -25.5 } }, // account for daily.csv
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } },
      { status: 200, json: { netLiq: 52050, cash: 52050, margin: 0, dayPnlRealized: 150.25, dayPnlUnrealized: -25.5 } }, // account for email
    ]);

    const app = buildServer();

    const j = await app.inject({ method: 'GET', url: `/export/daily.json?date=${date}` });
    expect(j.statusCode).toBe(200);
    const body = j.json();
    expect(body.summary.ticketsCount).toBe(2);
    expect(body.summary.blockedCount).toBe(1);
    expect(body.summary.pnl.realized).toBeCloseTo(150.25, 2);

    const c = await app.inject({ method: 'GET', url: `/export/daily.csv?date=${date}` });
    expect(c.statusCode).toBe(200);
    expect(c.headers['content-type']).toContain('text/csv');
    expect(c.body).toContain('symbol,side,qty,entry');

    // No SMTP env -> dry run
    const e = await app.inject({
      method: 'POST',
      url: '/report/email-daily',
      payload: { date, to: 'ops@example.com' }
    });
    expect(e.statusCode).toBe(200);
    const er = e.json();
    expect(er.transport).toBe('dry-run');
    expect(er.preview).toContain('TO: ops@example.com');
  });
});
