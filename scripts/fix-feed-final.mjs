import fs from 'node:fs';
import path from 'node:path';

const p = path.join('apps','api','src','jobs','feed.ts');
let s = fs.readFileSync(p, 'utf8');
const orig = s;

// 1) Normalize bad imports -> only getConfig from ../config/env.js
s = s.replace(
  /^\s*import\s*\{[^}]*\}\s*from\s*['"]\.\.\/config\/env\.js['"]\s*;?\s*$/mg,
  "import { getConfig } from '../config/env.js';"
);
// If no getConfig import exists, add it just after the first import block.
if (!/from '\.\.\/config\/env\.js'/.test(s)) {
  s = s.replace(/^((?:import[^\n]*\n)+)/m, (m)=> `${m}import { getConfig } from '../config/env.js';\n`);
}

// 2) Remove any tvUrl-derived loginUrl, and any leftover references to tvUrl/env/hasTradovateAuth
s = s.replace(/^\s*const\s+loginUrl\s*=\s*tvUrl\([^)]*\)\s*;?\s*$/mg, '');
s = s.replace(/\benv\.JOBS_ENABLE_FEED\b/g, 'cfg.jobs.enableFeed');
s = s.replace(/\bhasTradovateAuth\b/g, 'hasAuth');

// 3) Keep exactly ONE "const cfg = getConfig();" (remove duplicates)
{
  const lines = s.split('\n');
  let seen = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*const\s+cfg\s*=\s*getConfig\(\)\s*;?\s*$/.test(lines[i])) {
      if (seen) { lines.splice(i, 1); i--; continue; }
      seen = true;
    }
  }
  s = lines.join('\n');
}
// If missing entirely, insert once after imports
if (!/\bconst\s+cfg\s*=\s*getConfig\(\)/.test(s)) {
  s = s.replace(/^((?:import[^\n]*\n)+)/m, (m)=> `${m}\nconst cfg = getConfig();\n`);
}

// 4) Delete ALL hasAuth/clientEnv blocks; we’ll insert fresh ones (idempotent)
s = s.replace(/^\s*const\s+hasAuth\s*=\s*Boolean\([\s\S]*?\)\s*;?\s*$/mg, '');
s = s.replace(/^\s*const\s+clientEnv\s*[:\w\s<>\[\],]*=\s*\{\s*[\s\S]*?\}\s*;?\s*$/mg, '');

// 5) Insert fresh hasAuth + clientEnv immediately after cfg (once)
s = s.replace(
  /(\bconst\s+cfg\s*=\s*getConfig\(\)\s*;?\s*\n)(?!const\s+hasAuth\b)/,
  `$1const hasAuth = Boolean(
  cfg.tradovate?.baseUrl &&
  cfg.tradovate?.clientId &&
  cfg.tradovate?.username &&
  cfg.tradovate?.password &&
  cfg.tradovate?.appId &&
  cfg.tradovate?.appVersion
);

const clientEnv = {
  baseUrl: cfg.tradovate.baseUrl!,
  clientId: cfg.tradovate.clientId!,
  username: cfg.tradovate.username!,
  password: cfg.tradovate.password!,
  appId: cfg.tradovate.appId!,
  appVersion: cfg.tradovate.appVersion!,
};
`
);

// 6) Force client creation to use our env, relax type to avoid strict ClientEnv mismatches
s = s.replace(
  /createTradovateDemoClient\s*\(\s*\{[\s\S]*?\}\s*\)/g,
  'createTradovateDemoClient(clientEnv as any)'
);
s = s.replace(
  /createTradovateDemoClient\s*\(\s*clientEnv\s*\)/g,
  'createTradovateDemoClient(clientEnv as any)'
);

// 7) Final tidy
s = s.replace(/\n{3,}/g, '\n\n');

if (s !== orig) {
  fs.writeFileSync(p, s, 'utf8');
  console.log('fix-feed-final: feed.ts patched');
} else {
  console.log('fix-feed-final: no changes needed');
}
