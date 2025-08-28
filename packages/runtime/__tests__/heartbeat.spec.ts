import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHeartbeat } from '../src/heartbeat';

describe('heartbeat + stale detection', () => {
  let now = 0;
  const nowFn = () => now;
  const advance = (ms: number) => {
    now += ms;
    vi.advanceTimersByTime(ms);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    now = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends heartbeats at interval', () => {
    const sends: string[] = [];
    const hb = createHeartbeat({
      send: (d) => sends.push(d),
      onStale: () => {},
      intervalMs: 1000,
      staleMs: 5000,
      nowFn,
    });
    hb.start();
    expect(sends.length).toBe(0);
    advance(999);
    expect(sends.length).toBe(0);
    advance(2);
    expect(sends.length).toBe(1);
    advance(1000);
    expect(sends.length).toBe(2);
  });

  it('calls onStale after no inbound for staleMs', () => {
    const onStale = vi.fn();
    const hb = createHeartbeat({
      send: () => {},
      onStale,
      intervalMs: 1000,
      staleMs: 3000,
      nowFn,
    });
    hb.start();
    // Receive something at t=0
    hb.markRx();
    advance(2999);
    expect(onStale).not.toHaveBeenCalled();
    advance(2);
    expect(onStale).toHaveBeenCalledTimes(1);
    // Mark receive again resets timer
    hb.markRx();
    advance(2500);
    expect(onStale).toHaveBeenCalledTimes(1);
  });
});
