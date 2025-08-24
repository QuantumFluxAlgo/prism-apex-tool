import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server.js').buildServer;
let store: typeof import('../store.js').store;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
  ({ buildServer } = await import('../server.js'));
  ({ store } = await import('../store.js'));
});

describe('Export API', () => {
  it('exports tickets as CSV', async () => {
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
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.body).toContain('symbol');
    expect(res.body).toContain('ES');
  });
});
