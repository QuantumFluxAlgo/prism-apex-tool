import fs from 'node:fs';
import path from 'node:path';

const p = path.resolve('apps/api/src/jobs/feed.ts');
if (!fs.existsSync(p)) {
  console.info('fix-feed: file not found, skipping', p);
  process.exit(0);
}
let s = fs.readFileSync(p, 'utf8');
const orig = s;

// 1) Replace old import with getConfig (remove tvUrl, hasTradovateAuth, env)
s = s.replace(
  /import\s*\{[^}]*\}\s*from\s*'\.\.\/config\/env\.js';?/,
  "import { getConfig } from '../config/env.js';"
);

// 2) Ensure a single `const cfg = getConfig();` (once only)
if (!/\bconst\s+cfg\s*=\s*getConfig\(\)/.test(s)) {
  // Put it after the first import block
  s = s.replace(/^((?:import[^\n]*\n)+)/m, `$1const cfg = getConfig();\n`);
}

// 3) Provide/refresh a correct clientEnv (without loginUrl)
//    If a ClientEnv block exists, replace its body with the correct keys.
s = s.replace(
  /const\s+clientEnv\s*:\s*ClientEnv\s*=\s*\{[\s\S]*?\};/m,
  "const clientEnv: ClientEnv = {\n" +
  "  baseUrl: cfg.tradovate.baseUrl!,\n" +
  "  clientId: cfg.tradovate.clientId!,\n" +
  "  username: cfg.tradovate.username!,\n" +
  "  password: cfg.tradovate.password!,\n" +
  "  appId: cfg.tradovate.appId!,\n" +
  "  appVersion: cfg.tradovate.appVersion!,\n" +
  "};"
);

// If that block didn't exist, insert it right after cfg.
if (!/const\s+clientEnv\s*:\s*ClientEnv\s*=/.test(s)) {
  s = s.replace(
    /const\s+cfg\s*=\s*getConfig\(\);\s*/,
    "const cfg = getConfig();\n\nconst clientEnv: ClientEnv = {\n" +
    "  baseUrl: cfg.tradovate.baseUrl!,\n" +
    "  clientId: cfg.tradovate.clientId!,\n" +
    "  username: cfg.tradovate.username!,\n" +
    "  password: cfg.tradovate.password!,\n" +
    "  appId: cfg.tradovate.appId!,\n" +
    "  appVersion: cfg.tradovate.appVersion!,\n" +
    "};\n"
  );
}

// 4) Hard-remove any `loginUrl:` and stray duplicate `baseUrl:` lines in option objects
s = s.replace(/^\s*loginUrl\s*:\s*.*\r?\n/mg, '');
s = s.replace(/^\s*baseUrl\s*:\s*.*\r?\n/mg, '');

// 5) Force `createTradovateDemoClient(clientEnv)` usage
s = s.replace(
  /createTradovateDemoClient\s*\(\s*\{[\s\S]*?\}\s*\)/g,
  'createTradovateDemoClient(clientEnv)'
);

// 6) If the import line still mentions tvUrl/hasTradovateAuth/env (edge), nuke them again.
s = s.replace(
  /import\s*\{[^}]*\}\s*from\s*'\.\.\/config\/env\.js';?/,
  "import { getConfig } from '../config/env.js';"
);

if (s !== orig) {
  fs.writeFileSync(p, s, 'utf8');
  console.info('fix-feed: updated', p);
} else {
  console.info('fix-feed: no changes', p);
}
