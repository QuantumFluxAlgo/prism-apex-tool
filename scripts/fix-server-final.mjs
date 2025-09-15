import fs from 'node:fs';
import path from 'node:path';

const p = path.join('apps','api','src','server.ts');
let s = fs.readFileSync(p, 'utf8');
const orig = s;

// Drop dynamic plugin registration form: app.register(import('./jobs/boot.js'));
s = s.replace(/app\.register\(\s*import\(['"]\.\/jobs\/boot\.js['"]\)\s*\)\s*;?\s*/g, '');

// Drop a dangling tail that looked like:
//   "} else { app.log.info('feed job disabled: JOBS_ENABLE_FEED=false'); } );"
s = s.replace(
  /\n\s*\}\s*else\s*\{\s*\n\s*app\.log\.info\([^\n]*JOBS_ENABLE_FEED=false[^\n]*\);\s*\n\s*\}\s*\n\s*\}\);\s*\n?/m,
  '\n'
);

// If a lone "});" remains right after "return app; }", remove just that trailing line
s = s.replace(/(\breturn\s+app;\s*\}\s*\n)\s*\}\);\s*\n?/g, '$1');

if (s !== orig) {
  fs.writeFileSync(p, s, 'utf8');
  console.info('fix-server-final: server.ts cleaned');
} else {
  console.info('fix-server-final: no changes needed');
}
