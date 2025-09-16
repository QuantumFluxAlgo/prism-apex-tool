import { describe, it, expect, vi } from 'vitest';
import { withJobs } from '@prism-apex/app-api/tests/helpers/jobs.js';
import { setJobBeat } from '@prism-apex/runtime';

process.env.ENABLE_TELEMETRY = 'true';
withJobs();

const sampleSnapshot = {
  accounts: [{ accountId: 'A1', balance: 1000 }],
  positions: [{ accountId: 'A1', contract: 'ESZ4', symbolRoot: 'ES', qty: 1, avgPrice: 100 }],
  fills: [
    {
      accountId: 'A1',
      contract: 'ESZ4',
      side: 'SELL',
      qty: 1,
      price: 110,
      ts: new Date().toISOString(),
    },
  ],
  dailyPnL: [{ date: new Date().toISOString().slice(0, 10), net: 10 }],
  bufferCleared: false,
};

vi.mock('@prism-apex/clients-tradovate/telemetry', () => ({
  createTelemetryClient: () => ({
    start(cb: any) {
      cb(sampleSnapshot);
      return { stop() {} };
    },
  }),
}));

describe.skip('telemetry API', () => {
  it('exposes telemetry via routes and provider', async () => {
    const { buildServer } = await import('@prism-apex/app-api/server.js');
    const app = buildServer();
    setJobBeat('telemetry');
    await new Promise((r) => setImmediate(r));
    const ready = await app.inject({ method: 'GET', url: '/ready' });
    expect(ready.json().jobs.telemetry.healthy).toBe(true);
    const pos = await app.inject({ method: 'GET', url: '/telemetry/positions?accountId=A1' });
    expect(pos.json()[0].contract).toBe('ESZ4');
    const acct = await app.inject({ method: 'GET', url: '/telemetry/account?accountId=A1' });
    expect(acct.json().balance).toBe(1000);
    const fills = await app.inject({
      method: 'GET',
      url: `/telemetry/fills?accountId=A1&date=${sampleSnapshot.dailyPnL[0].date}`,
    });
    expect(fills.json()).toHaveLength(1);
    const report = await app.inject({
      method: 'GET',
      url: `/report/consistency?accountId=A1&window=1`,
    });
    expect(report.json().totals.net).toBe(10);
    await app.close();
  });
});
