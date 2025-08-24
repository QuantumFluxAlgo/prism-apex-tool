import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server').buildServer;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-'));
  ({ buildServer } = await import('../server.js'));
});

describe('Rules API', () => {
  it('evaluates account state compliance', async () => {
    const app = buildServer();
    const state = {
      phase: 'funded',
      balance: 10000,
      equityHigh: 10000,
      openPositions: [{ contracts: 1 }],
      tradeHistory: [],
      dayPnL: {},
      trailingDrawdown: 6000,
    };
    const res = await app.inject({ method: 'POST', url: '/rules/check', payload: state });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.violations.some((v: any) => v.id === 'funded-stoploss')).toBe(true);
  });
});
