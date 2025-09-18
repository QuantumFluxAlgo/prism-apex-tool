import fs from 'node:fs';
const p = 'apps/api/src/routes/tickets.ts';
let s = fs.readFileSync(p, 'utf8');
const before = s;
const rx = /listTickets\(([^)]*?),\s*q\.data\.strategy\)/;
s = s.replace(rx, (_m, pre) => `listTickets(${pre}, ((q.data.strategy==='ORR'||q.data.strategy==='Open Range Retest (ORR)')?'APX-DDB-01':q.data.strategy))`);
if (s === before) {
  console.error('NO_MATCH');
  process.exit(2);
}
fs.writeFileSync(p, s);
console.log('PATCHED');
