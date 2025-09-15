import { describe, it, expect } from 'vitest';
import { barsFile, appendJSONL } from '../src/io.js';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

describe('file I/O helpers', () => {
  it('builds a sanitized bars file path and ensures directory', () => {
    const base = mkdtempSync(join(tmpdir(), 'bars-'));
    const file = barsFile(base, 'BRK.B', '2024-01-01');
    expect(file).toContain('BRK_B');
    expect(file.endsWith('2024-01-01.jsonl')).toBe(true);
    expect(existsSync(dirname(file))).toBe(true);
    rmSync(base, { recursive: true, force: true });
  });

  it('appends objects as JSON lines', () => {
    const base = mkdtempSync(join(tmpdir(), 'bars-'));
    const file = join(base, 'sample.jsonl');
    appendJSONL(file, { a: 1 });
    appendJSONL(file, { b: 2 });
    const txt = readFileSync(file, 'utf8');
    expect(txt.trim().split('\n')).toHaveLength(2);
    rmSync(base, { recursive: true, force: true });
  });
});
