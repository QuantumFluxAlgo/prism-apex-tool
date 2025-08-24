import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server').buildServer;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'alerts-'));
  ({ buildServer } = await import('../server.js'));
});

describe('Alerts API', () => {
  it('acks alerts and removes from peek', async () => {
    const app = buildServer();
    const payload = { alert: { id: 'a1', ts: '2025-01-01T00:00:00Z', raw: {} }, human: { text: 'hi' } };
    await app.inject({ method: 'POST', url: '/ingest/alert', payload });
    const peek1 = await app.inject({ method: 'GET', url: '/alerts/peek' });
    expect(peek1.json()).toHaveLength(1);
    const ack = await app.inject({ method: 'POST', url: '/alerts/ack', payload: { id: 'a1' } });
    expect(ack.statusCode).toBe(200);
    expect(ack.json()).toEqual({ ok: true });
    const peek2 = await app.inject({ method: 'GET', url: '/alerts/peek' });
    expect(peek2.json()).toHaveLength(0);
  });
});
