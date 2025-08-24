import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server').buildServer;
let store: typeof import('../store').store;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'report-'));
  ({ buildServer } = await import('../server.js'));
  ({ store } = await import('../store.js'));
});

describe('Report API', () => {
  it('returns daily report summary', async () => {
    store.appendTicket({ when: '2025-01-01T00:00:00Z', ticket: { id: '1' }, reasons: [] });
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/report/daily?date=2025-01-01' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ date: '2025-01-01', trades: 1, blocked: 0 });
  });
});
