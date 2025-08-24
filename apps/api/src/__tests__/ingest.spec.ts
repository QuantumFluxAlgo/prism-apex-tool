import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server').buildServer;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-'));
  ({ buildServer } = await import('../server.js'));
});

describe('Ingest API', () => {
  it('stores alert and exposes via peek', async () => {
    const app = buildServer();
    const payload = { alert: { id: '1', ts: '2025-01-01T00:00:00Z', raw: {} }, human: { text: 'hi' } };
    const post = await app.inject({ method: 'POST', url: '/ingest/alert', payload });
    expect(post.statusCode).toBe(200);
    const peek = await app.inject({ method: 'GET', url: '/alerts/peek?limit=10' });
    expect(peek.statusCode).toBe(200);
    const arr = peek.json();
    expect(arr[0]?.id).toBe('1');
  });
});
