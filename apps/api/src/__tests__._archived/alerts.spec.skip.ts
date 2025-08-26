import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server.js').buildServer;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'alerts-'));
  process.env.FLAT_BY_UTC = '23:59';
  ({ buildServer } = await import('../server.js'));
});

describe('Alerts API', () => {
  it('peeks and acknowledges alerts', async () => {
    const app = buildServer();
    await app.inject({
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
    const peek = await app.inject({ method: 'GET', url: '/alerts/peek?limit=5' });
    expect(peek.statusCode).toBe(200);
    expect(peek.json()).toHaveLength(1);
    const ack = await app.inject({ method: 'POST', url: '/alerts/ack', payload: { id: 'a1' } });
    expect(ack.statusCode).toBe(200);
    const peek2 = await app.inject({ method: 'GET', url: '/alerts/peek?limit=5' });
    expect(peek2.json()).toHaveLength(0);
  });
});
