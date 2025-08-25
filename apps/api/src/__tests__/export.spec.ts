import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server.js').buildServer;
let store: typeof import('../store.js').store;
let Accounts: typeof import('../lib/accounts.js').Accounts;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
  ({ buildServer } = await import('../server.js'));
  ({ store } = await import('../store.js'));
  ({ Accounts } = await import('../lib/accounts.js'));
});

describe('Export API', () => {
  it('returns enriched JSON by default', async () => {
    store.appendTicket({
      when: '2024-08-24T12:00:00Z',
      ticket: {
        id: 't1',
        symbol: 'ES',
        side: 'BUY',
        qty: 1,
        entry: 1,
        stop: 0,
        targets: [2],
      } as any,
      reasons: [],
    });
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/export/tickets?date=2024-08-24' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const body = res.json();
    expect(body[0]).toHaveProperty('accepted');
    expect(body[0]).toHaveProperty('rr');
    expect(body[0].flatByUtc).toBe('20:59');
  });

  it('exports CSV when format=csv', async () => {
    store.appendTicket({
      when: '2024-08-24T12:00:00Z',
      ticket: {
        id: 't1',
        symbol: 'ES',
        side: 'BUY',
        qty: 1,
        entry: 1,
        stop: 0,
        targets: [2],
      } as any,
      reasons: [],
    });
    const app = buildServer();
    const res = await app.inject({
      method: 'GET',
      url: '/export/tickets?date=2024-08-24&format=csv',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.body).toContain('accepted');
    expect(res.body).toContain('rr');
  });

  it('includes sizing when accountId provided', async () => {
    await Accounts.upsert({ id: 'PA-TEST', maxContracts: 10, bufferCleared: true });
    store.appendTicket({
      when: '2024-08-24T12:00:00Z',
      ticket: {
        id: 't1',
        symbol: 'ES',
        side: 'BUY',
        qty: 1,
        entry: 1,
        stop: 0,
        targets: [2],
      } as any,
      reasons: [],
    });
    const app = buildServer();
    const resJson = await app.inject({
      method: 'GET',
      url: '/export/tickets?date=2024-08-24&accountId=PA-TEST',
    });
    const body = resJson.json();
    expect(body[0]).toHaveProperty('sizeSuggested');
    expect(body[0]).toHaveProperty('halfSizeSuggested');
    const resCsv = await app.inject({
      method: 'GET',
      url: '/export/tickets?date=2024-08-24&accountId=PA-TEST&format=csv',
    });
    expect(resCsv.body).toContain('size_suggested');
  });

  it('marks preCloseSuppressed within window', async () => {
    process.env.FLAT_BY_UTC = '20:59';
    store.appendTicket({
      when: '2024-08-24T20:55:00Z',
      ticket: {
        id: 't1',
        symbol: 'ES',
        side: 'BUY',
        qty: 1,
        entry: 1,
        stop: 0,
        targets: [2],
      } as any,
      reasons: [],
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-08-24T20:55:00Z'));
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/export/tickets?date=2024-08-24' });
    vi.useRealTimers();
    const body = res.json();
    expect(body[0].preCloseSuppressed).toBe(true);
  });
});
