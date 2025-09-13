import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function barsFile(baseDir: string, symbol: string, ymd: string) {
  const dir = join(baseDir, symbol.replace(/[^A-Z0-9=]/gi, '_'));
  mkdirSync(dir, { recursive: true });
  return join(dir, `${ymd}.jsonl`);
}

export function appendJSONL(path: string, obj: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(obj) + '\n', 'utf8');
}
