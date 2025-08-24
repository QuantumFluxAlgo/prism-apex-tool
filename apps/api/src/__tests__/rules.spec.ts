import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let buildServer: typeof import('../server.js').buildServer;

beforeEach(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-'));
  ({ buildServer } = await import('../server.js'));
});

describe('Rules API', () => {
  it('evaluates account state', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/rules/check',
      payload: {
        phase: 'evaluation',
        balance: 50000,
        equityHigh: 50000,
        openPositions: [{ contracts: 1 }],
        tradeHistory: [],
        dayPnL: {},
        trailingDrawdown: 1000,
        isEndOfDay: true,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.violations.length).toBeGreaterThan(0);
  });
});
