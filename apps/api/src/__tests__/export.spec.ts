import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server').buildServer;
let store: typeof import('../store').store;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
  ({ buildServer } = await import('../server.js'));
  ({ store } = await import('../store.js'));
});

describe('Export API', () => {
  it('returns CSV for tickets', async () => {
    store.appendTicket({ when: '2025-01-01T00:00:00Z', ticket: { id: '1', symbol: 'ES', side: 'BUY', qty: 1, entry: 1, stop: 0, targets: [] }, reasons: [] });
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/export/tickets?date=2025-01-01' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.body.split('\n')[0]).toContain('symbol');
  });
});
