import fs from 'fs';

function setStrategiesOnlyORR(file) {
  if (!fs.existsSync(file)) return console.log(file+': missing (skip)');
  let s = fs.readFileSync(file, 'utf8');
  const rx = /export const STRATEGIES\s*=\s*\[[^\]]*\];/m;
  if (rx.test(s)) {
    s = s.replace(rx, "export const STRATEGIES = ['ORR'];");
    fs.writeFileSync(file, s);
    console.log(file+': STRATEGIES -> [ORR]');
  } else {
    console.log(file+': STRATEGIES not found (skip)');
  }
}

function labelPatch(file) {
  if (!fs.existsSync(file)) return console.log(file+': missing (skip)');
  let s = fs.readFileSync(file, 'utf8');
  if (!/STRATEGY_LABELS/.test(s)) {
    // Insert label map after first import block end
    s = s.replace(/(\n(?:import .*\n)+)/m, `$1\nconst STRATEGY_LABELS: Record<string,string> = { 'APX-DDB-01': 'ORR', ORR: 'ORR' };\n`);
  }
  const t = s.replace(/\bt\.meta\.strategy\b/g, '(STRATEGY_LABELS[t.meta.strategy] ?? t.meta.strategy)');
  if (t !== s) {
    fs.writeFileSync(file, t);
    console.log(file+': display maps APX-DDB-01 -> ORR');
  } else {
    console.log(file+': no display occurrences changed (maybe already mapped)');
  }
}

// full dashboard: constants + table
setStrategiesOnlyORR('apps/dashboard/src/constants.ts');
labelPatch('apps/dashboard/src/components/TicketsTable.tsx');

// dashboard-lite: constants (if exists) + table variants (name may differ)
setStrategiesOnlyORR('apps/dashboard-lite/src/constants.ts');
labelPatch('apps/dashboard-lite/src/components/TicketsTable.tsx');
labelPatch('apps/dashboard-lite/src/components/ticketstable.tsx');
