/**
 * Dev-only CLI: read a JSON array of {symbol, ts, high, low, close, volume},
 * write JSONL cache, and print weekly anchored VWAP at end.
 */
import { readFileSync } from 'node:fs';
import { barsFile, appendJSONL } from './io.js';
import { initAVWAP, stepAVWAP, valueAVWAP } from './vwap.js';

const [, , inputJson = '', cacheDir = '.cache/bars'] = process.argv;
if (!inputJson) {
  console.error('Usage: node replay-yahoo-bars.cjs <bars.json> [cacheDir]');
  process.exit(1);
}
const arr = JSON.parse(readFileSync(inputJson, 'utf8'));
if (!Array.isArray(arr)) {
  console.error('Input must be a JSON array');
  process.exit(1);
}

let av = initAVWAP(arr[0]?.ts || new Date().toISOString());
for (const b of arr) {
  if (!b || !b.symbol || !b.ts) continue;
  if (!(b.volume > 0)) continue;
  const ymd = String(b.ts).slice(0, 10);
  appendJSONL(barsFile(cacheDir, b.symbol, ymd), b);
  av = stepAVWAP(av, Number(b.high), Number(b.low), Number(b.close), Number(b.volume));
}
const v = valueAVWAP(av);
console.info(
  JSON.stringify({ weeklyVWAP: Number.isFinite(v) ? Number(v.toFixed(4)) : null }, null, 2),
);
