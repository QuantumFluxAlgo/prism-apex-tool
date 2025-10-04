/* eslint-disable no-console */
import fs from 'fs';
const p = 'apps/dashboard/src/constants.ts';
let s = fs.readFileSync(p, 'utf8');
if (!/export const STRATEGY_LABELS/.test(s)) {
  const block = "\nexport const STRATEGY_LABELS: Record<string,string> = { ORR: 'Open Range Retest (ORR)' };\n";
  s = s.replace(/export const STRATEGIES\s*=\s*\[[^\]]*\];/m, "export const STRATEGIES = ['ORR'];" + block);
} else {
  s = s.replace(/export const STRATEGIES\s*=\s*\[[^\]]*\];/m, "export const STRATEGIES = ['ORR'];");
}
fs.writeFileSync(p, s);
console.log('constants.ts patched');
