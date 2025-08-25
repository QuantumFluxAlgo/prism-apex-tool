import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server.js').buildServer;
let store: typeof import('../store.js').store;
let Accounts: typeof import('../lib/accounts.js').Accounts;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-'));
  process.env.FLAT_BY_UTC = '23:59';
  process.env.ENFORCE_SIZE_HINTS = 'false';
  ({ buildServer } = await import('../server.js'));
  ({ store } = await import('../store.js'));
  ({ Accounts } = await import('../lib/accounts.js'));
});

describe('Ingest API', () => {
  it('queues alerts when accepted', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/ingest/alert',
      payload: {
        symbol: 'ES',
        side: 'BUY',
        entry: 100,
        stop: 99,
        target: 103,
        alert: { id: 'a1', ts: '2024-08-24T00:00:00Z', raw: {} },
        human: { text: 'hi' },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accepted).toBe(true);
    const q = store.peekAlerts(10);
    expect(q[0]?.id).toBe('a1');
  });

  it('rejects violations', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/ingest/alert',
      payload: { symbol: 'ES', side: 'BUY', entry: 100, stop: 99, target: 101 },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().accepted).toBe(false);
    const q = store.peekAlerts(10);
    expect(q.length).toBe(0);
  });

  it('enforces size hints when enabled', async () => {
    process.env.ENFORCE_SIZE_HINTS = 'true';
    await Accounts.upsert({ id: 'A1', maxContracts: 2, bufferCleared: false });
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/ingest/alert',
      payload: { symbol: 'ES', side: 'BUY', entry: 100, stop: 99, target: 103, qty: 2, accountId: 'A1' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().reasons).toContain('qty exceeds allowed');
  });

  it('returns sizing info when enforcement disabled', async () => {
    process.env.ENFORCE_SIZE_HINTS = 'false';
    await Accounts.upsert({ id: 'A1', maxContracts: 2, bufferCleared: false });
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/ingest/alert',
      payload: { symbol: 'ES', side: 'BUY', entry: 100, stop: 99, target: 103, qty: 1, accountId: 'A1' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().sizing).toMatchObject({ allowed: 1, halfSizeSuggested: true });
  });
});
