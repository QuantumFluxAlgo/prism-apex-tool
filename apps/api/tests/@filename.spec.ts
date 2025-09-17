import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as fs from 'node:fs';

// 👇 Replace this with the module you want to test, e.g. '../../ingress-yahoo-dev/src/server'
const TARGET = '../../ingress-yahoo-dev/src/server';

let mod: any;
let app: any;
let supertestLib: any;

const describeIf = (cond: unknown) =>
  cond ? describe : (name: string, fn: () => void) => it.skip(name, fn as any);

beforeAll(async () => {
  // Safe defaults if your module reads these
  process.env.APEX_ENABLE_YAHOO_INGRESS ??= 'true';
  process.env.APEX_YAHOO_SHARED_SECRET ??= 'test-secret';

  // Import target
  mod = await import(TARGET);
  app = mod.app ?? (typeof mod.createApp === 'function' ? mod.createApp() : mod.default);

  // Optional: load supertest if available so HTTP smoke can run
  try {
    const m = await import('supertest');
    supertestLib = (m as any).default ?? m;
  } catch {
    supertestLib = null; // skip HTTP smoke if supertest isn't installed
  }
});

describe(`module: ${TARGET}`, () => {
  it('loads', () => {
    expect(mod).toBeTruthy();
  });

  it('has no undefined named exports', () => {
    for (const [k, v] of Object.entries(mod)) {
      expect(v, `export "${k}"`).not.toBeUndefined();
    }
  });

  it('default export (if present) is function or object', () => {
    if ('default' in mod) {
      expect(['function', 'object']).toContain(typeof mod.default);
    }
  });
});

// If an Express app is exported and supertest is present, do a tiny HTTP smoke test
describeIf(!!app && supertestLib)('HTTP smoke', () => {
  const request = supertestLib!(app);
  it('GET /health -> 200 or 404', async () => {
    const res = await request.get('/health');
    expect([200, 404]).toContain(res.status);
  });
});

// If a write helper is exported, check it writes UTF-8 without touching real disk
describeIf(typeof (mod as any)?.writeFileSyncAtomic === 'function')('writeFileSyncAtomic', () => {
  it('creates parent dir and writes UTF-8', () => {
    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any);
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined as any);

    (mod as any).writeFileSyncAtomic('/tmp/example.json', '{"ok":true}');

    expect(mkdirSpy).toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalledWith('/tmp/example.json', '{"ok":true}', 'utf8');

    mkdirSpy.mockRestore();
    writeSpy.mockRestore();
  });
});
