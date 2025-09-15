/**
 * Global Vitest setup (unit-focused)
 * - Force UTC timezone for deterministic date behavior
 * - Reset modules/timers between tests
 * - Provide safe default envs used by the app
 * - Reduce console noise (keep warn/error)
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { beforeAll, beforeEach, afterEach, vi } from 'vitest';

beforeAll(() => {
  // UTC by default
  process.env.TZ = 'UTC';

  // Safe default envs (non-secret; optional)
  process.env.NODE_ENV ??= 'test';
  process.env.LOG_LEVEL ??= 'error';

  // Avoid noisy console in unit runs; preserve warnings/errors
  const allow = new Set(['warn', 'error']);
  for (const k of ['log','info','debug','trace'] as const) {
    if (!(k in console)) continue;
    // @ts-expect-error intentional override for tests
      // eslint-disable-next-line no-console
    console[k] = (...args: unknown[]) => {
      if (allow.has(k)) return (console as any)[k](...args);
      // swallow noise
    };
  }
});

beforeEach(() => {
  // Fresh fake timers OFF by default; enable per-test when needed
  vi.useRealTimers();
  vi.resetAllMocks();
  vi.clearAllTimers();
  vi.clearAllMocks();
  vi.resetModules(); // isolate module state
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  vi.clearAllTimers();
});
