import { describe, it, expect, beforeEach, vi } from 'vitest';

let buildServer: typeof import('../server.js').buildServer;

beforeEach(async () => {
  ({ buildServer } = await import('../server.js'));
});

describe('report consistency API', () => {
  it('returns passing result', async () => {
    vi.setSystemTime(new Date('2024-01-08T00:00:00Z'));
    const app = buildServer();
    const accountId = 'A1';
    const base = new Date('2024-01-08');
    for (let i = 0; i < 8; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      await app.inject({
        method: 'POST',
        url: '/debug/pnl/upsert',
        payload: { accountId, date: d.toISOString().slice(0, 10), net: 60 - i },
      });
    }
    const res = await app.inject({
      method: 'GET',
      url: `/report/consistency?accountId=${accountId}&window=8`,
    });
    const body = res.json();
    expect(body.passed).toBe(true);
    await app.close();
  });

  it('flags topday>30% reason', async () => {
    vi.setSystemTime(new Date('2024-01-08T00:00:00Z'));
    const app = buildServer();
    const accountId = 'A2';
    const base = new Date('2024-01-08');
    const nets = [300, 50, 50, 50, 50, 50, 50, 50];
    for (let i = 0; i < 8; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      await app.inject({
        method: 'POST',
        url: '/debug/pnl/upsert',
        payload: { accountId, date: d.toISOString().slice(0, 10), net: nets[i] },
      });
    }
    const res = await app.inject({
      method: 'GET',
      url: `/report/consistency?accountId=${accountId}&window=8`,
    });
    const body = res.json();
    expect(body.passed).toBe(false);
    expect(body.reasons).toContain('topday>30%');
    await app.close();
  });

  it('flags profitDays<5 reason', async () => {
    vi.setSystemTime(new Date('2024-01-08T00:00:00Z'));
    const app = buildServer();
    const accountId = 'A3';
    const base = new Date('2024-01-08');
    const nets = [50, 50, 50, 50, 0, 0, 0, 0];
    for (let i = 0; i < 8; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      await app.inject({
        method: 'POST',
        url: '/debug/pnl/upsert',
        payload: { accountId, date: d.toISOString().slice(0, 10), net: nets[i] },
      });
    }
    const res = await app.inject({
      method: 'GET',
      url: `/report/consistency?accountId=${accountId}&window=8`,
    });
    const body = res.json();
    expect(body.passed).toBe(false);
    expect(body.reasons).toContain('profitDays<5');
    await app.close();
  });
});
