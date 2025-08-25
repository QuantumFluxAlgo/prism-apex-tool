import { describe, expect, it, vi } from 'vitest';
import { MarketDataWS } from '../ws.js';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((ev: { data: any }) => void) | null = null;
  sent: any[] = [];
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
    setTimeout(() => this.onopen && this.onopen(), 0);
  }
  send(data: any) {
    this.sent.push(data);
  }
  close() {
    if (this.onclose) this.onclose();
  }
}

describe('MarketDataWS', () => {
  it('sends heartbeats every 2.5s', () => {
    vi.useFakeTimers();
    const ws = new MarketDataWS({ url: 'u', token: 'tok', WebSocketCtor: FakeWebSocket as any });
    ws.connect();
    vi.runOnlyPendingTimers();
    vi.advanceTimersByTime(2500);
    const inst = FakeWebSocket.instances[0];
    expect(inst.sent[0]).toMatch(/authorize/);
    expect(inst.sent).toContain('[]');
    vi.useRealTimers();
  });

  it('reconnects after close with backoff', () => {
    vi.useFakeTimers();
    const ws = new MarketDataWS({ url: 'u', token: 'tok', WebSocketCtor: FakeWebSocket as any });
    ws.connect();
    vi.runOnlyPendingTimers();
    const first = FakeWebSocket.instances[0];
    first.close();
    vi.advanceTimersByTime(1100);
    expect(FakeWebSocket.instances.length).toBeGreaterThan(1);
    vi.useRealTimers();
  });
});
