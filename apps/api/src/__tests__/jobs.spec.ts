import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../server';
import { store } from '../store';

describe('job scheduler', () => {
  let app: ReturnType<typeof buildServer>;

  beforeEach(() => {
    vi.useFakeTimers();
    store.setOcoMissing(false);
    app = buildServer();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await app.close();
  });

  it('runs jobs on schedule and reports status', async () => {
    const res0 = await app.inject({ method: 'GET', url: '/jobs/status' });
    expect(res0.statusCode).toBe(200);
    const initial = res0.json();
    expect(Array.isArray(initial)).toBe(true);

    vi.advanceTimersByTime(15_000);
    expect(store.getOcoMissing()).toBe(true);

    const res1 = await app.inject({ method: 'GET', url: '/jobs/status' });
    const afterTick = res1.json();
    const mb = afterTick.find((j: any) => j.name === 'MISSING_BRACKETS');
    expect(mb.lastRun).toBeGreaterThan(0);

    const dlBefore = afterTick.find((j: any) => j.name === 'DAILY_LOSS');
    const beforeRun = dlBefore.lastRun || 0;
    const runRes = await app.inject({ method: 'POST', url: '/jobs/run/DAILY_LOSS' });
    expect(runRes.statusCode).toBe(200);

    const res2 = await app.inject({ method: 'GET', url: '/jobs/status' });
    const afterRun = res2.json();
    const dlAfter = afterRun.find((j: any) => j.name === 'DAILY_LOSS');
    expect(dlAfter.lastRun).toBeGreaterThan(beforeRun);
  });
});
