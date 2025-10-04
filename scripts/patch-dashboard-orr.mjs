/* eslint-disable no-console */
import fs from 'fs';

function patchApi() {
  const p = 'apps/dashboard/src/lib/api.ts';
  let s = fs.readFileSync(p, 'utf8');
  if (!s.includes('strategy=ORR')) {
    s = s.replace('?date=${date}', '?date=${date}&strategy=ORR');
    fs.writeFileSync(p, s);
    console.log('api.ts: OK');
  } else {
    console.log('api.ts: already patched');
  }
}

function patchExportLink() {
  const p = 'apps/dashboard/src/pages/Tickets.tsx';
  if (!fs.existsSync(p)) { console.log('Tickets.tsx: not found (skipped)'); return; }
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  s = s.replace('/export/tickets?date=${date}', '/export/tickets?date=${date}&strategy=ORR');
  if (s !== before) { fs.writeFileSync(p, s); console.log('Tickets.tsx: OK'); }
  else { console.log('Tickets.tsx: already patched or pattern not found'); }
}

function patchConstants() {
  const p = 'apps/dashboard/src/constants.ts';
  if (!fs.existsSync(p)) { console.log('constants.ts: not found (skipped)'); return; }
  let s = fs.readFileSync(p, 'utf8');
  if (!/'ORR'/.test(s)) {
    s = s.replace(/export const STRATEGIES\s*=\s*\[[^\]]*\];/m, "export const STRATEGIES = ['ORR','VWAP_FT','OSB','APX-DDB-01'];");
    fs.writeFileSync(p, s);
    console.log('constants.ts: OK');
  } else {
    console.log('constants.ts: already includes ORR');
  }
}

patchApi();
patchExportLink();
patchConstants();
