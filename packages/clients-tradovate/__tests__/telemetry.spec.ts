import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTelemetryClient, Env, TelemetrySnapshot } from '../src/telemetry.js';

vi.mock('../src/auth.js', () => ({
  login: vi.fn().mockResolvedValue({
    accessToken: 't',
    mdAccessToken: 'm',
    userId: 1,
    expiresAt: Date.now() + 60000,
  }),
}));

const env: Env = {
  restBase: 'https://demo',
  appId: 'id',
  appVersion: 'ver',
  user: 'u',
  password: 'p',
  cid: 'cid',
  sec: 'sec',
  deviceId: 'd',
  bufferThreshold: 2500,
};

function makeFetch(data: { accounts?: any[]; positions?: any[]; fills?: any[] }) {
  return vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => data.accounts ?? [] })
    .mockResolvedValueOnce({ ok: true, json: async () => data.positions ?? [] })
    .mockResolvedValueOnce({ ok: true, json: async () => data.fills ?? [] });
}

describe('telemetry client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('produces a shaped snapshot', async () => {
    const fetchMock = makeFetch({
      accounts: [{ id: 'A1', balance: 1000 }],
      positions: [{ accountId: 'A1', contract: 'ESZ4', symbol: 'ES', netPos: 1, avgPrice: 100 }],
      fills: [
        {
          accountId: 'A1',
          contractId: 'ESZ4',
          side: 'BUY',
          quantity: 1,
          price: 100,
          timestamp: '2024-01-01T10:00:00Z',
        },
        {
          accountId: 'A1',
          contractId: 'ESZ4',
          side: 'SELL',
          quantity: 1,
          price: 110,
          timestamp: '2024-01-01T11:00:00Z',
        },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = createTelemetryClient(env, { pollMs: 1000 });
    const snaps: TelemetrySnapshot[] = [];
    const { stop } = client.start((s) => snaps.push(s));
    await vi.advanceTimersByTimeAsync(10);
    stop();
    expect(snaps).toHaveLength(1);
    const s = snaps[0];
    expect(s.accounts[0].balance).toBe(1000);
    expect(s.positions[0].contract).toBe('ESZ4');
    expect(s.dailyPnL[0].net).toBe(10);
  });

  it('flips bufferCleared when threshold crossed', async () => {
    const fetchMock = makeFetch({
      accounts: [{ id: 'A1', balance: 1000 }],
      positions: [],
      fills: [
        {
          accountId: 'A1',
          contractId: 'ESZ4',
          side: 'SELL',
          quantity: 1,
          price: 3000,
          timestamp: '2024-01-01T10:00:00Z',
        },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = createTelemetryClient(env, { pollMs: 1000 });
    let snap: TelemetrySnapshot | null = null;
    const { stop } = client.start((s) => (snap = s));
    await vi.advanceTimersByTimeAsync(10);
    stop();
    expect(snap?.bufferCleared).toBe(true);
  });

  it('handles empty data', async () => {
    const fetchMock = makeFetch({});
    vi.stubGlobal('fetch', fetchMock);
    const client = createTelemetryClient(env, { pollMs: 1000 });
    const snaps: TelemetrySnapshot[] = [];
    const { stop } = client.start((s) => snaps.push(s));
    await vi.advanceTimersByTimeAsync(10);
    stop();
    expect(snaps[0]).toEqual({
      accounts: [],
      positions: [],
      fills: [],
      dailyPnL: [],
      bufferCleared: false,
    });
  });
});
