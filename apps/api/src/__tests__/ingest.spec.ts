import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server.js').buildServer;
let store: typeof import('../store.js').store;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-'));
  ({ buildServer } = await import('../server.js'));
  ({ store } = await import('../store.js'));
});

describe('Ingest API', () => {
  it('queues alerts', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/ingest/alert',
      payload: { alert: { id: 'a1', ts: '2024-08-24T00:00:00Z', raw: {} }, human: { text: 'hi' } },
    });
    expect(res.statusCode).toBe(200);
    const q = store.peekAlerts(10);
    expect(q[0]?.id).toBe('a1');
  });
});
