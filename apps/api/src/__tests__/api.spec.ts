import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../server';

// Mock Tradovate client responses (global fetch)
function mockFetchSequence(responses: { status: number; json: any }[]) {
  let i = 0;
  (globalThis as any).fetch = vi.fn(async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.json,
    } as Response;
  });
}

beforeEach(() => {
  process.env.TRADOVATE_BASE_URL = 'https://example.test/v1';
  process.env.TRADOVATE_USERNAME = 'u';
  process.env.TRADOVATE_PASSWORD = 'p';
  process.env.TRADOVATE_CLIENT_ID = 'cid';
  process.env.TRADOVATE_CLIENT_SECRET = 'sec';
  vi.useRealTimers();
});

describe('API basics', () => {
  it('health', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('market/account', async () => {
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } },
      { status: 200, json: { netLiq: 52000, cash: 52000, margin: 0, dayPnlRealized: 0, dayPnlUnrealized: 0 } },
    ]);
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/account' });
    expect(res.statusCode).toBe(200);
    expect(res.json().netLiq).toBe(52000);
  });

  it('signals/preview ORB returns block=false for sane geometry', async () => {
    const RealDate = Date;
    vi.spyOn(global, 'Date').mockImplementation(((...args: any[]) => {
      if (args.length === 0) return new RealDate('2025-08-17T14:01:00.000Z');
      // @ts-ignore
      return new RealDate(...args);
    }) as any);
     (Date as any).now = () => new RealDate('2025-08-17T14:01:00.000Z').getTime();
    (Date as any).parse = RealDate.parse;
    (Date as any).UTC = RealDate.UTC;

    // Login + Bars + Account
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } },
      { status: 200, json: Array.from({length: 32}, (_,i) => {
          const m = 30 + i; const hh = 13 + Math.floor(m/60); const mm = String(m%60).padStart(2,'0');
          const ts = `2025-08-17T${String(hh).padStart(2,'0')}:${mm}:00.000Z`;
          const c = 5000 + (i<31 ? 0 : 3); // breakout after OR
          return { ts, symbol:'ES', interval:'1m', o:c-0.25, h:c+0.5, l:c-0.5, c, v:100 };
        })
      },
      { status: 200, json: { netLiq: 52000, cash: 52000, margin: 0, dayPnlRealized: 0, dayPnlUnrealized: 0 } },
    ]);
    const app = buildServer();
    const payload = {
      strategy: 'OPEN_SESSION',
      symbol: 'ES',
      contract: 'ESU5',
      cfg: {
        symbol: 'ES',
        contract: 'ESU5',
        rthStart: '13:30',
        orMinutes: 30,
        tickSize: 0.25,
        tickBuffer: 0.25,
        maxTradesPerDay: 1,
        tradesTakenToday: 0,
        targetMultiples: [1],
        qty: 1,
      }
    };
    const res = await app.inject({ method: 'POST', url: '/signals/preview', payload });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ticket).toBeTruthy();
    expect(body.block).toBe(false);
    (global.Date as any).mockRestore?.();
  });

  it('tickets/commit blocks when EOD T-5 window', async () => {
    const RealDate = Date;
    vi.spyOn(global, 'Date').mockImplementation(((...args: any[]) => {
      if (args.length === 0) return new RealDate('2025-08-17T20:58:30.000Z');
      // @ts-ignore
      return new RealDate(...args);
    }) as any);
     (Date as any).now = () => new RealDate('2025-08-17T20:58:30.000Z').getTime();
    (Date as any).parse = RealDate.parse;
    (Date as any).UTC = RealDate.UTC;

    // Login + Account
    mockFetchSequence([
      { status: 200, json: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 } },
      { status: 200, json: { netLiq: 52000, cash: 52000, margin: 0, dayPnlRealized: 0, dayPnlUnrealized: 0 } },
    ]);
    const app = buildServer();
    const ticket = {
      id: 't1',
      symbol: 'ES',
      contract: 'ESU5',
      side: 'BUY',
      qty: 1,
      order: { type: 'LIMIT', entry: 5000, stop: 4995, targets: [5005], tif: 'DAY', oco: true },
      risk: { perTradeUsd: 5, rMultipleByTarget: [1] },
      apex: { stopRequired: true, rrLeq5: true, ddHeadroom: true, halfSize: true, eodReady: true, consistency30: 'OK' }
    };
    const res = await app.inject({ method: 'POST', url: '/tickets/commit', payload: { ticket } });
    expect(res.statusCode).toBe(400);
    expect(res.json().reasons.join(' ')).toMatch(/EOD window/i);
    (global.Date as any).mockRestore?.();
  });
});
