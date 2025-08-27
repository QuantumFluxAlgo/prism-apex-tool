import { describe, it, expect, vi } from 'vitest';
import { ResilientWS, retryWithPenalty, expBackoff } from '../src/index.js';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((ev: { data: any }) => void) | null = null;
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  send(_data: any) {}
  close() {
    this.onclose?.();
  }
}

describe('ws resilience', () => {
  it('reconnects on stale connections and re-subscribes', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const subscribe = vi.fn();
    const ws = new ResilientWS({
      url: 'u',
      getToken: async () => 'tok',
      subscribe,
      WebSocketCtor: FakeWebSocket as any,
    });
    await ws.connect();
    const first = FakeWebSocket.instances[0];
    first.onopen?.();
    expect(subscribe).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(6000);
    await vi.advanceTimersByTimeAsync(300); // allow reconnect delay
    expect(FakeWebSocket.instances.length).toBeGreaterThan(1);
    const second = FakeWebSocket.instances[1];
    second.onopen?.();
    expect(subscribe).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('honors rate-limit penalties before retrying', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const fn = vi
      .fn<[], Promise<any>>()
      .mockResolvedValueOnce({ status: 429, pTicket: 'X', pTime: 5 })
      .mockResolvedValueOnce({ status: 200, value: 'ok' });
    const p = retryWithPenalty<string>(() => fn(fn.mock.calls.length === 0 ? undefined : 'X'));
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    await p;
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[1][0]).toBe('X');
    vi.useRealTimers();
  });

  it('backoff grows with attempts', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const d0 = expBackoff(0);
    const d1 = expBackoff(1);
    const d2 = expBackoff(2);
    const d3 = expBackoff(3);
    expect(d0).toBeLessThan(d1);
    expect(d1).toBeLessThan(d2);
    expect(d2).toBeLessThan(d3);
    expect(d3).toBeLessThanOrEqual(30_000);
  });
});
