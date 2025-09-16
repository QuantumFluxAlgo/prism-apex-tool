import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let buildServer: typeof import('@prism-apex/app-api/server.js').buildServer;

beforeEach(async () => {
  vi.resetModules();
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pat-'));
  process.env.ACCOUNT_PHASE = 'eval';
  ({ buildServer } = await import('@prism-apex/app-api/server.js'));
});

describe.skip('/tickets/promote', () => {
  it('accepts a valid suggestion', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/promote',
      payload: {
        suggestion: {
          id: '1',
          symbol: 'ESZ4',
          side: 'BUY',
          qty: 4,
          entry: 100,
          stop: 99,
          targets: [102],
          reasons: [],
          meta: { strategy: 'VWAP_FT' },
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.ticket.qty).toBe(2);
    expect(body.ticket.meta.guardrails).toContain('rr-clamp');
    await app.close();
  });

  it('rejects low rr', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/promote',
      payload: {
        suggestion: {
          id: '2',
          symbol: 'ESZ4',
          side: 'BUY',
          qty: 1,
          entry: 100,
          stop: 99,
          targets: [100.5],
          reasons: [],
          meta: { strategy: 'VWAP_FT' },
        },
      },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects missing stop in funded', async () => {
    process.env.ACCOUNT_PHASE = 'funded';
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/promote',
      payload: {
        suggestion: {
          id: '3',
          symbol: 'ESZ4',
          side: 'BUY',
          qty: 1,
          entry: 100,
          targets: [102],
          reasons: [],
          meta: { strategy: 'VWAP_FT' },
        },
      },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
    process.env.ACCOUNT_PHASE = 'eval';
  });

  it('accepts missing stop in eval', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/promote',
      payload: {
        suggestion: {
          id: '6',
          symbol: 'ESZ4',
          side: 'BUY',
          qty: 1,
          entry: 100,
          targets: [102],
          reasons: [],
          meta: { strategy: 'VWAP_FT' },
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as any;
    expect(body.ticket.meta.guardrails).toContain('stop-optional');
    await app.close();
  });

  it('rejects windfall qty jumps in funded', async () => {
    process.env.ACCOUNT_PHASE = 'funded';
    const app = buildServer();
    // Baseline small ticket
    await app.inject({
      method: 'POST',
      url: '/tickets/promote',
      payload: {
        suggestion: {
          id: '4',
          symbol: 'ESZ4',
          side: 'BUY',
          qty: 1,
          entry: 100,
          stop: 99,
          targets: [102],
          reasons: [],
          meta: { strategy: 'VWAP_FT' },
        },
      },
    });
    // Jump to big size
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/promote',
      payload: {
        suggestion: {
          id: '5',
          symbol: 'ESZ4',
          side: 'BUY',
          qty: 10,
          entry: 100,
          stop: 99,
          targets: [102],
          reasons: [],
          meta: { strategy: 'VWAP_FT' },
        },
      },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
    process.env.ACCOUNT_PHASE = 'eval';
  });
});
