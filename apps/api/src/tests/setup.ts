// Global Vitest setup for API package
import { beforeEach, afterEach, vi } from 'vitest';

// Keep tests isolated: prevents job re-registration & stale singletons
beforeEach(() => {
  vi.resetModules();
  // Keep logs quiet unless explicitly overridden in a test
  if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = 'fatal';
});

// Clean up any env tweaks a test might have applied
afterEach(() => {
  // Add keys here if tests set them temporarily
  for (const k of [
    'BEARER_TOKEN',
    'RATE_LIMIT_MAX',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_BUCKETS',
  ]) {
    if (Object.prototype.hasOwnProperty.call(process.env, k) && process.env[k] === '') {
      delete process.env[k];
    }
  }
});
