import { describe, it, expect, vi, afterEach } from 'vitest';

// Stub node:fs before importing module-under-test
vi.mock('node:fs', () => {
  return {
    default: {
      readFileSync: (pathLike: any, _enc?: string) => {
        // Minimal package.json with a version field
        if (String(pathLike).includes('/package.json')) {
          return JSON.stringify({ version: '1.2.3' });
        }
        throw new Error('Unexpected readFileSync path: ' + String(pathLike));
      },
    },
  };
});

afterEach(() => vi.clearAllMocks());

// Import after mocks so the module uses our stub
import { getAppVersion } from '../src/utils/version.js';

describe('getAppVersion', () => {
  it('returns the version from package.json', () => {
    const v = getAppVersion();
    expect(v).toBe('1.2.3');
  });

  it('throws if version is missing', async () => {
    const { default: fs } = await import('node:fs');
    // @ts-expect-error accessing mocked function
    fs.readFileSync = vi.fn().mockReturnValueOnce('{}');

    // Re-import fresh copy with isolated module cache
    vi.resetModules();
    vi.doMock('node:fs', () => ({ default: fs }));
    const mod = await import('../src/utils/version.js');
    expect(() => mod.getAppVersion()).toThrow(/version/i);
  });
});
