import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server.js').buildServer;
let store: typeof import('../store.js').store;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'report-'));
  ({ buildServer } = await import('../server.js'));
  ({ store } = await import('../store.js'));
});

describe('Report API', () => {
  it('builds daily report', async () => {
    store.appendTicket({
      when: '2024-08-24T10:00:00Z',
      ticket: { id: 't1' } as any,
      reasons: [],
    });
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/report/daily?date=2024-08-24' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.date).toBe('2024-08-24');
    expect(body.trades).toBe(1);
  });
});
