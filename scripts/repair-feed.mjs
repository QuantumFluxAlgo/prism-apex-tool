import fs from 'node:fs';
import path from 'node:path';

const p = path.join('apps','api','src','jobs','feed.ts');
let s = fs.readFileSync(p, 'utf8');
const orig = s;

// (1) Normalize imports: replace any tvUrl/env/hasTradovateAuth import with getConfig
s = s.replace(
  /^\s*import\s*\{\s*(?:tvUrl|env|hasTradovateAuth)(?:\s*,\s*(?:tvUrl|env|hasTradovateAuth))*\s*\}\s*from\s*['"]\.\.\/config\/env\.js['"]\s*;\s*$/m,
  "import { getConfig } from '../config/env.js';"
);
// If getConfig isn't imported anywhere, add it after first import block.
if (!/from '\.\.\/config\/env\.js'/.test(s)) {
  s = s.replace(/^((?:import[^\n]*\n)+)/m, (m) => `${m}import { getConfig } from '../config/env.js';\n`);
}

// (2) Remove tvUrl usage (e.g., const loginUrl = tvUrl('/auth/...');)
s = s.replace(/^\s*const\s+loginUrl\s*=\s*tvUrl\([^)]*\)\s*;\s*$/m, '');

// (3) Drop any duplicate cfg/hasAuth/clientEnv so we can reinsert cleanly
s = s.replace(/^\s*const\s+cfg\s*=\s*getConfig\(\)\s*;\s*$/mg, '');
s = s.replace(/^\s*const\s+hasAuth\s*=\s*.*;\s*$/mg, '');
s = s.replace(/^\s*const\s+clientEnv\s*[^=]*=\s*\{\s*[\s\S]*?\}\s*;\s*$/mg, '');

// (4) Ensure exactly one cfg after imports
if (!/\bconst\s+cfg\s*=\s*getConfig\(\)/.test(s)) {
  s = s.replace(/^((?:import[^\n]*\n)+)/m, (m)=> `${m}\nconst cfg = getConfig();\n`);
}

// (5) Insert hasAuth + clientEnv immediately after cfg
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

// (6) Replace any remaining guards/references
s = s.replace(/\benv\.JOBS_ENABLE_FEED\b/g, 'cfg.jobs.enableFeed');
s = s.replace(/\bhasTradovateAuth\b/g, 'hasAuth');

// (7) Force client creation to use our env object; loosen types (avoid ClientEnv mismatch)
s = s.replace(
  /createTradovateDemoClient\s*\(\s*\{[\s\S]*?\}\s*\)/g,
  'createTradovateDemoClient(clientEnv as any)'
);
s = s.replace(
  /createTradovateDemoClient\s*\(\s*clientEnv\s*\)/g,
  'createTradovateDemoClient(clientEnv as any)'
);

// (8) Small tidy: compress excessive blank lines
s = s.replace(/\n{3,}/g, '\n\n');

if (s !== orig) {
  fs.writeFileSync(p, s, 'utf8');
  console.log('repair-feed: updated jobs/feed.ts');
} else {
  console.log('repair-feed: no changes needed');
}
