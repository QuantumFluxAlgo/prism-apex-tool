/* eslint-disable no-console */
import fs from 'fs';
const file = 'apps/api/src/routes/tickets.ts';
let s = fs.readFileSync(file, 'utf8');
if (!/displayStrategy\s*=/.test(s)) {
  s = s.replace(/(^(\s*import[^\n]*\n)+)/m, `$1\nconst displayStrategy = (s: string) => (s === 'APX-DDB-01' || s === 'ORR') ? 'ORR' : s;\n`);
}
const next = s.replace(/(\.map\(\s*\(\s*t\s*\)\s*=>\s*\[\s*[^]*?timestampUtc,\s*)t\.meta\.strategy(\s*,)/m, `$1displayStrategy(t.meta.strategy)$2`);
if (next === s) { console.error('NO_CHANGE'); process.exit(2); }
fs.writeFileSync(file, next);
console.log('PATCHED');
