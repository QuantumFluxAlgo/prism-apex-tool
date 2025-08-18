import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
let buildServer: any;

beforeEach(async () => {
  process.env.DATA_DIR = '/tmp/prism-test';
  try { fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); } catch {}
  process.env.TRADINGVIEW_WEBHOOK_SECRET = 's3cr3t';
  delete process.env.TRADINGVIEW_HMAC_SECRET; // default off in tests
  process.env.TRADOVATE_BASE_URL = 'https://example.test/v1';
  process.env.TRADOVATE_USERNAME = 'u';
  process.env.TRADOVATE_PASSWORD = 'p';
  process.env.TRADOVATE_CLIENT_ID = 'cid';
  process.env.TRADOVATE_CLIENT_SECRET = 'sec';
  const mod = await import('../server');
  buildServer = mod.buildServer;
});

describe('TradingView ingest', () => {
  it('rejects missing secret', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST', url: '/ingest/tradingview',
      payload: { message: 'ES BUY 5000' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts with correct secret and enqueues', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST', url: '/ingest/tradingview',
      headers: { 'x-webhook-secret': 's3cr3t', 'content-type': 'application/json' },
      payload: { alert_id: 'abc', symbol: 'ES', side: 'BUY', price: 5000.25, reason: 'VWAP touch' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);

    const q = await app.inject({ method: 'GET', url: '/alerts/queue?limit=10' });
    expect(q.statusCode).toBe(200);
    const arr = q.json() as any[];
    expect(arr.length).toBeGreaterThan(0);
    expect(arr[0].symbol).toBe('ES');

    const ack = await app.inject({ method: 'POST', url: '/alerts/ack', payload: { id: arr[0].id } });
    expect(ack.statusCode).toBe(200);
  });

  it('deduplicates within 24h window', async () => {
    const app = buildServer();
    const payload = { alert_id: 'dup', ts: '2025-08-17T14:00:00.000Z', message: 'ES BUY 5000 [reason: OR break]' };
    const headers = { 'x-webhook-secret': 's3cr3t', 'content-type': 'application/json' };

    await app.inject({ method: 'POST', url: '/ingest/tradingview', headers, payload });
    await app.inject({ method: 'POST', url: '/ingest/tradingview', headers, payload });

    const q = await app.inject({ method: 'GET', url: '/alerts/queue?limit=50' });
    const arr = q.json() as any[];
    expect(arr.length).toBe(1);
  });
});
