import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeSymbol } from '../routes/webhooks.tradingview';

let buildServer: typeof import('../server.js').buildServer;

beforeEach(async () => {
  vi.resetModules();
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tvw-'));
  process.env.FLAT_BY_UTC = '23:59';
});

describe('TradingView webhook', () => {
  it('returns 422 when secret not configured', async () => {
    ({ buildServer } = await import('../server.js'));
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/webhooks/tradingview', payload: {} });
    expect(res.statusCode).toBe(422);
  });

  it('returns 401 when secret missing or invalid', async () => {
    process.env.TRADINGVIEW_WEBHOOK_SECRET = 's';
    ({ buildServer } = await import('../server.js'));
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/tradingview',
      headers: { 'x-webhook-secret': 'bad' },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 422 when guard rejects', async () => {
    process.env.TRADINGVIEW_WEBHOOK_SECRET = 's';
    ({ buildServer } = await import('../server.js'));
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/tradingview',
      headers: { 'x-webhook-secret': 's' },
      payload: { symbol: 'ES', side: 'BUY', entry: 100, stop: 99, target: 101 },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ accepted: false });
  });

  it('returns 202 when guard accepts valid payload', async () => {
    process.env.TRADINGVIEW_WEBHOOK_SECRET = 's';
    ({ buildServer } = await import('../server.js'));
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/tradingview',
      headers: { 'x-webhook-secret': 's' },
      payload: { symbol: 'ES', side: 'BUY', entry: 100, stop: 99, target: 103 },
    });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ accepted: true, rr: expect.any(Number) });
  });

  it('normalizes ES1! to ES', () => {
    expect(normalizeSymbol('ES1!')).toBe('ES');
  });
});
