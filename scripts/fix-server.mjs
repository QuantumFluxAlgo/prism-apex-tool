import fs from 'node:fs';
import path from 'node:path';

const p = path.resolve('apps/api/src/server.ts');
if (!fs.existsSync(p)) {
  console.log('fix-server: file not found, skipping', p);
  process.exit(0);
}

let s = fs.readFileSync(p, 'utf8');
const orig = s;

// A) Health route: named -> default import + usage (safe if absent)
s = s.replace(
  /import\s*\{\s*healthRoutes\s*\}\s*from\s*'\.\/routes\/health\.js';/g,
  "import healthRoute from './routes/health.js';"
);
s = s.replace(/\bregister\(\s*healthRoutes\s*\)/g, 'register(healthRoute)');

// B) Ensure imports for getConfig and jobsBoot (don’t duplicate)
if (!/from '\.\/config\/env\.js'/.test(s)) {
  s = s.replace(/^((?:import[^\n]*\n)+)/m, `$1import { getConfig } from './config/env.js';\n`);
}
if (!/from '\.\/jobs\/boot\.js'/.test(s)) {
  s = s.replace(/^((?:import[^\n]*\n)+)/m, `$1import jobsBoot from './jobs/boot.js';\n`);
}

// C) Ensure a single `const cfg = getConfig();` after fastify(...)
if (!/\bconst\s+cfg\s*=\s*getConfig\(\)/.test(s)) {
  s = s.replace(
    /(const\s+app\s*=\s*fastify\([\s\S]*?\);\s*)/,
    (_m) => _m + "\nconst cfg = getConfig();\n"
  );
}

// D) Remove stale/stray job-related imports & naked usages
s = s.replace(/^\s*import\s*\{\s*env\s*\}\s*from\s*'\.\/config\/env\.js';\s*$/mg, '');
s = s.replace(/^\s*import\s*\{\s*JobManager\s*\}\s*from\s*'\.\/lib\/jobManager\.js';\s*$/mg, '');
s = s.replace(/^\s*import\s*\{\s*FeedJob\s*\}\s*from\s*'\.\/jobs\/feed\.js';\s*$/mg, '');
s = s.replace(/^\s*import\s*\{\s*registerFeedJob\s*\}\s*from\s*'\.\/jobs\/feed\.js';\s*$/mg, '');
s = s.replace(/^[ \t]*registerFeedJob\(\);\s*$/mg, '');

// E) Remove any if(env.JOBS_ENABLE_FEED) ... else ... block (and their remnants)
s = s.replace(/^\s*if\s*\(\s*env\.JOBS_ENABLE_FEED[\s\S]*?\n\}\s*(?:else\s*\{[\s\S]*?\n\}\s*)?/mg, '');

// F) Remove any dangling app.addHook('onReady', ...) blocks that were injected incorrectly
s = s.replace(/^\s*app\.addHook\('onReady'[\s\S]*?\);\s*$/mg, '');

// G) Drop dynamic `app.register(import('./jobs/boot.js'))`
s = s.replace(/app\.register\(\s*import\('\.\/jobs\/boot\.js'\)\s*\)\s*;?/g, '');

// H) Ensure exactly one static `app.register(jobsBoot);`
if (!/app\.register\(\s*jobsBoot\s*\)/.test(s)) {
  // Append after the LAST existing app.register(...) call if present, else at EOF
  const last = s.lastIndexOf('app.register(');
  if (last !== -1) {
    const nl = s.indexOf('\n', last);
    s = s.slice(0, nl + 1) + 'app.register(jobsBoot);\n' + s.slice(nl + 1);
  } else {
    s += '\napp.register(jobsBoot);\n';
  }
}

// I) Remove previously injected “jobs guard” and any stray bogus line
s = s.replace(/\/\/\s*---\s*jobs guard[\s\S]*?(?=^\S|$)/gm, '');
s = s.replace(/^[ \t]*app\.\-zshRoute\);\r?\n?/m, '');

// J) Final sanity trim of accidental duplicated cfg lines (rare)
s = s.replace(/const\s+cfg\s*=\s*getConfig\(\);\s*const\s+cfg\s*=\s*getConfig\(\);/g, 'const cfg = getConfig();');

if (s !== orig) {
  fs.writeFileSync(p, s, 'utf8');
  console.log('fix-server: updated', p);
} else {
  console.log('fix-server: no changes', p);
}
