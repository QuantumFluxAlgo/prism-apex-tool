import fs from 'node:fs';

function bad(msg){ console.error('VERIFY FAIL:', msg); process.exit(1); }

// --- server.ts
const s = fs.readFileSync('apps/api/src/server.ts','utf8');
const hasJobsBootImport = /import\s+jobsBoot\s+from\s+'\.\/jobs\/boot\.js';/.test(s);
const dynImportLeft = /app\.register\(\s*import\(['"]\.\/jobs\/boot\.js['"]\)\s*\)/.test(s);
const trailingHook = /\}\s*else\s*\{[\s\S]*JOBS_ENABLE_FEED=false[\s\S]*\}\s*\}\);\s*$/.test(s);

if (!hasJobsBootImport) bad('missing "import jobsBoot from \'./jobs/boot.js\'" in server.ts');
if (dynImportLeft) bad('found dynamic app.register(import("./jobs/boot.js"))) in server.ts');
if (trailingHook) bad('dangling onReady/else tail still present in server.ts');

// --- feed.ts
const f = fs.readFileSync('apps/api/src/jobs/feed.ts','utf8');
const hasCfg = /\bconst\s+cfg\s*=\s*getConfig\(\)/.test(f);
const hasAuth = /\bconst\s+hasAuth\s*=/.test(f);
const hasClientEnv = /\bconst\s+clientEnv\s*=/.test(f);
const badImports = /\b(tvUrl|hasTradovateAuth|env)\b.*from\s+'\.\.\/config\/env\.js'/.test(f);
const dupCfg = (f.match(/const\s+cfg\s*=\s*getConfig\(\)/g) || []).length > 1;
const dupHasAuth = (f.match(/const\s+hasAuth\s*=/g) || []).length > 1;
const dupClientEnv = (f.match(/const\s+clientEnv\s*=/g) || []).length > 1;

if (!hasCfg) bad('feed.ts missing const cfg = getConfig()');
if (!hasAuth) bad('feed.ts missing const hasAuth = …');
if (!hasClientEnv) bad('feed.ts missing const clientEnv = …');
if (badImports) bad('feed.ts still imports tvUrl/hasTradovateAuth/env from config');
if (dupCfg || dupHasAuth || dupClientEnv) bad('feed.ts has duplicate cfg/hasAuth/clientEnv');

console.log('VERIFY OK');
