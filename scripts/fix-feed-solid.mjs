import fs from 'node:fs';
import path from 'node:path';

const p = path.join('apps','api','src','jobs','feed.ts');
let s = fs.readFileSync(p, 'utf8');
const orig = s;

// 1) Normalize the bad import line(s): remove tvUrl/hasTradovateAuth/env import;
//    ensure a single getConfig import exists (idempotent).
s = s.replace(
  /^\s*import\s*\{\s*tvUrl\s*,\s*hasTradovateAuth\s*,\s*env\s*\}\s*from\s*['"]\.\.\/config\/env\.js['"]\s*;\s*$/m,
  "import { getConfig } from '../config/env.js';"
);
s = s.replace(
  /^\s*import\s*\{\s*(?:tvUrl|env|hasTradovateAuth)(?:\s*,\s*(?:tvUrl|env|hasTradovateAuth))*\s*\}\s*from\s*['"]\.\.\/config\/env\.js['"]\s*;\s*$/m,
  "import { getConfig } from '../config/env.js';"
);
if (!/from '\.\.\/config\/env\.js'/.test(s)) {
  // put getConfig import just after the first import block
  s = s.replace(/^((?:import[^\n]*\n)+)/m, (m)=> `${m}import { getConfig } from '../config/env.js';\n`);
}

// 2) Kill any "const loginUrl = tvUrl(...)" line(s)
s = s.replace(/^\s*const\s+loginUrl\s*=\s*tvUrl\([^)]*\)\s*;\s*$/mg, '');

// 3) Ensure exactly one cfg/hasAuth/clientEnv block (remove dupes, then reinsert once).
//    a) remove any existing 'const cfg = getConfig()' lines except the first
{
  const lines = s.split('\n');
  let seenCfg = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*const\s+cfg\s*=\s*getConfig\(\)\s*;/.test(lines[i])) {
      if (seenCfg) { lines.splice(i, 1); i--; continue; }
      seenCfg = true;
    }
  }
  s = lines.join('\n');
}
//    b) remove ALL 'const hasAuth = ...' lines (we'll insert a clean one)
s = s.replace(/^\s*const\s+hasAuth\s*=\s*.*;\s*$/mg, '');
//    c) remove ALL 'const clientEnv ... = { ... }' blocks (we'll insert a clean one)
s = s.replace(/^\s*const\s+clientEnv\s*[^=]*=\s*\{\s*[\s\S]*?\}\s*;\s*$/mg, '');

// 4) Ensure there is one cfg declaration. If missing, insert just after imports.
if (!/\bconst\s+cfg\s*=\s*getConfig\(\)/.test(s)) {
  s = s.replace(/^((?:import[^\n]*\n)+)/m, (m)=> `${m}\nconst cfg = getConfig();\n`);
}

// 5) Insert a fresh hasAuth + clientEnv immediately after the cfg line.
s = s.replace(
  /(\bconst\s+cfg\s*=\s*getConfig\(\)\s*;\s*\n)(?!const\s+hasAuth\b)/,
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

// 6) Replace any remaining references:
//    - env.JOBS_ENABLE_FEED -> cfg.jobs.enableFeed
//    - hasTradovateAuth -> hasAuth
s = s.replace(/\benv\.JOBS_ENABLE_FEED\b/g, 'cfg.jobs.enableFeed');
s = s.replace(/\bhasTradovateAuth\b/g, 'hasAuth');

// 7) Force client creation to use our env object, and silence type mismatch via 'as any'.
//    This avoids tight coupling to a possibly stricter ClientEnv type.
s = s.replace(
  /createTradovateDemoClient\s*\(\s*\{[\s\S]*?\}\s*\)/g,
  'createTradovateDemoClient(clientEnv as any)'
);
// also handle cases where it's called with some other var
s = s.replace(
  /createTradovateDemoClient\s*\(\s*clientEnv\s*\)/g,
  'createTradovateDemoClient(clientEnv as any)'
);

// 8) Final tidy: remove accidental duplicate blank lines
s = s.replace(/\n{3,}/g, '\n\n');

if (s !== orig) {
  fs.writeFileSync(p, s, 'utf8');
  console.log('fix-feed-solid: feed.ts patched');
} else {
  console.log('fix-feed-solid: no changes needed');
}
