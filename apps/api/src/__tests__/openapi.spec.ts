import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: any;

beforeEach(async () => {
  vi.resetModules();
  Object.assign(process.env, {
    TRADOVATE_BASE_URL: 'http://localhost',
    TRADOVATE_USERNAME: 'user',
    TRADOVATE_PASSWORD: 'pass',
    TRADOVATE_CLIENT_ID: 'id',
    TRADOVATE_CLIENT_SECRET: 'secret',
    DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-')),
  });
  const mod = await import('../server');
  buildServer = mod.buildServer;
});

describe('OpenAPI conformance (MVP smoke)', () => {
  it('GET /health matches spec shape', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.ok).toBe('boolean');
  });

  it('Tickets list is an array of Ticket shape (subset)', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/tickets' });
    expect(res.statusCode).toBe(200);
    const arr = res.json();
    expect(Array.isArray(arr)).toBe(true);
    if (arr.length) {
      const t = arr[0];
      expect(typeof t.symbol).toBe('string');
      expect(['BUY', 'SELL']).toContain(t.side);
      expect(typeof t.entry).toBe('number');
    }
  });

  it('Preview accepts body and returns block/reasons per spec', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/signals/preview',
      payload: { symbol: 'ES', side: 'BUY', entry: 5000, stop: 4990, target: 5010, size: 1, mode: 'evaluation' }
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.block).toBe('boolean');
    expect(Array.isArray(body.reasons)).toBe(true);
  });

  it('OpenAPI endpoint returns a YAML container', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/openapi.json' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.openapi).toBe('3.1.0');
    expect(typeof body.yaml).toBe('string');
    expect(body.yaml).toMatch(/openapi:\s+3\.1\.0/);
  });
});
