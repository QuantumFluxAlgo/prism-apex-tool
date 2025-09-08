import fs from 'node:fs';
import path from 'node:path';

const p = path.join('apps','api','src','server.ts');
let s = fs.readFileSync(p, 'utf8');
const orig = s;

// (1) Drop any dynamic plugin registration: app.register(import('./jobs/boot.js'));
s = s.replace(/app\.register\(\s*import\(['"]\.\/jobs\/boot\.js['"]\)\s*\)\s*;?\s*/g, '');

// (2) Drop the dangling tail that sometimes looks like:
//     "} else { app.log.info('feed job disabled: JOBS_ENABLE_FEED=false'); } );"
s = s.replace(/\n\s*\}\s*else\s*\{\s*\n\s*app\.log\.info\([^\n]*JOBS_ENABLE_FEED=false[^\n]*\);\s*\n\s*\}\s*\n\s*\}\);\s*\n?/m, '\n');

// (3) Also remove a lone "});" that might remain after a return block
s = s.replace(/(\breturn\s+app;\s*\}\s*\n)\s*\}\);\s*\n?/g, '$1');

// (4) Ensure exactly one "import jobsBoot ..." and one "app.register(jobsBoot);"
if (!/import\s+jobsBoot\s+from\s+'\.\/jobs\/boot\.js';/.test(s)) {
  // Insert after the import block
  s = s.replace(/^((?:import[^\n]*\n)+)/m, (m)=> `${m}import jobsBoot from './jobs/boot.js';\n`);
}
const regMatches = s.match(/app\.register\(\s*jobsBoot\s*\)/g) || [];
if (regMatches.length === 0) {
  // Register near other register() calls if present, otherwise at EOF
  if (/app\.register\(/.test(s)) {
    const lastIdx = s.lastIndexOf('app.register(');
    const afterLast = s.indexOf('\n', lastIdx) + 1;
    s = s.slice(0, afterLast) + 'app.register(jobsBoot);\n' + s.slice(afterLast);
  } else {
    s += '\napp.register(jobsBoot);\n';
  }
} else if (regMatches.length > 1) {
  // Keep only the first occurrence
  let kept = false;
  s = s.replace(/app\.register\(\s*jobsBoot\s*\)\s*;?/g, () => kept ? '' : (kept = true, 'app.register(jobsBoot)'));
}

if (s !== orig) {
  fs.writeFileSync(p, s, 'utf8');
  console.log('repair-server: cleaned and normalized server.ts');
} else {
  console.log('repair-server: no changes needed');
}
