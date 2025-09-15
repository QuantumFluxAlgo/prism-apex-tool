import fs from 'node:fs/promises';
import path from 'node:path';

const repo = process.cwd();

async function readText(p){ try { return await fs.readFile(p,'utf8'); } catch { return null; } }
async function writeText(p,s){ await fs.writeFile(p,s,'utf8'); }

function has(re, s){ return re.test(s); }

async function patchFeed(){
  const p = path.join(repo, 'apps/api/src/jobs/feed.ts');
  let s = await readText(p);
  if (!s) return;

  // Replace old env imports with getConfig only
  s = s.replace(
    /import\s*\{\s*tvUrl\s*,\s*hasTradovateAuth\s*,\s*env\s*\}\s*from\s*'\.\.\/config\/env\.js';?/g,
    "import { getConfig } from '../config/env.js';"
  );

  // Ensure cfg is available near the top after imports
  if (!has(/\bconst\s+cfg\s*=\s*getConfig\(\)/, s)) {
    s = s.replace(/^((?:import[^\n]*\n)+)/m, (_m) => _m + "const cfg = getConfig();\n");
  }

  // Remove any 'loginUrl: ...' lines inside object literals (unsupported key)
  s = s.replace(/^\s*loginUrl\s*:\s*.*\r?\n/mg, '');

  // If there is a 'clientEnv' literal containing unsupported keys, rebuild it cleanly.
  // If not present, we'll inject a canonical one after cfg declaration.
  const clientEnvRe = /const\s+clientEnv\s*:\s*ClientEnv\s*=\s*\{[\s\S]*?\};/m;
  const canonicalClientEnv =
`const clientEnv: ClientEnv = {
  baseUrl: cfg.tradovate.baseUrl!,
  clientId: cfg.tradovate.clientId!,
  username: cfg.tradovate.username!,
  password: cfg.tradovate.password!,
  appId: cfg.tradovate.appId!,
  appVersion: cfg.tradovate.appVersion!,
};`;

  if (clientEnvRe.test(s)) {
    s = s.replace(clientEnvRe, canonicalClientEnv);
  } else {
    // insert right after cfg declaration
    s = s.replace(/(const\s+cfg\s*=\s*getConfig\(\);\s*)/, `$1\n${canonicalClientEnv}\n`);
  }

  // Force the demo client creation to use clientEnv (and strip any literal object)
  s = s.replace(
    /createTradovateDemoClient\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    'createTradovateDemoClient(clientEnv)'
  );

  await writeText(p, s);
}

async function patchServer(){
  const p = path.join(repo, 'apps/api/src/server.ts');
  let s = await readText(p);
  if (!s) return;

  // 1) health route: named -> default import + usage
  s = s.replace(
    /import\s*\{\s*healthRoutes\s*\}\s*from\s*'\.\/routes\/health\.js';/g,
    "import healthRoute from './routes/health.js';"
  );
  s = s.replace(/\bregister\(\s*healthRoutes\s*\)/g, 'register(healthRoute)');

  // 2) ensure imports for getConfig and jobsBoot
  if (!/from '\.\/config\/env\.js'/.test(s)) {
    s = s.replace(/^((?:import[^\n]*\n)+)/m, (m) => `${m}import { getConfig } from './config/env.js';\n`);
  }
  if (!/from '\.\/jobs\/boot\.js'/.test(s)) {
    s = s.replace(/^((?:import[^\n]*\n)+)/m, (m) => `${m}import jobsBoot from './jobs/boot.js';\n`);
  }

  // 3) ensure const cfg = getConfig(); soon after app = fastify(...)
  if (!/\bconst\s+cfg\s*=\s*getConfig\(\)/.test(s)) {
    s = s.replace(
      /(const\s+app\s*=\s*fastify\([\s\S]*?\);\s*)/,
      (_m)=> `${m}\nconst cfg = getConfig();\n`
    );
    if (!/\bconst\s+cfg\s*=\s*getConfig\(\)/.test(s)) {
      // fallback: put after import section
      s = s.replace(/^((?:import[^\n]*\n)+)/m, (_m)=> `${m}\nconst cfg = getConfig();\n`);
    }
  }

  // 4) remove stale imports/usages from earlier attempts
  s = s.replace(/^\s*import\s*\{\s*env\s*\}\s*from\s*'\.\/config\/env\.js';\s*$/gm, '');
  s = s.replace(/^\s*import\s*\{\s*JobManager\s*\}\s*from\s*'\.\/lib\/jobManager\.js';\s*$/gm, '');
  s = s.replace(/^\s*import\s*\{\s*FeedJob\s*\}\s*from\s*'\.\/jobs\/feed\.js';\s*$/gm, '');
  s = s.replace(/^\s*import\s*\{\s*registerFeedJob\s*\}\s*from\s*'\.\/jobs\/feed\.js';\s*$/gm, '');
  s = s.replace(/^[ \t]*registerFeedJob\(\);\s*$/gm, '');

  // 5) remove naked env/JobManager blocks that shouldn't be in server.ts
  //    (These were responsible for the many "Cannot find name 'env' / JobManager / FeedJob" errors.)
  s = s.replace(/^\s*if\s*\(\s*env\.JOBS_ENABLE_FEED[\s\S]*?\}\s*$/gm, '');
  s = s.replace(/^\s*JobManager\.startAll\([\s\S]*?\);\s*$/gm, '');
  s = s.replace(/^\s*app\.addHook\('onReady'[\s\S]*?\);\s*$/gm, '');

  // Remove any prior injected guard blobs / stray line
  s = s.replace(/\/\/\s*---\s*jobs guard[\s\S]*?(?=^\S|$)/gm, '');
  s = s.replace(/^[ \t]*app.-zshRoute\);\r?\n?/m, '');

  // 6) switch any dynamic app.register(import('./jobs/boot.js')) to static jobsBoot
  s = s.replace(/app\.register\(\s*import\('\.\/jobs\/boot\.js'\)\s*\)\s*;?/g, '');

  // Ensure exactly one static jobsBoot registration
  let count = 0;
  s = s.replace(/\s*app\.register\(\s*jobsBoot\s*\);\s*/g, (_m)=> {
    count += 1;
    return '\n'; // strip all, we’ll reinsert one
  });
  if (count === 0) {
    // insert after last existing app.register(...) if present; else append at EOF
    const lastIdx = s.lastIndexOf('app.register(');
    if (lastIdx !== -1) {
      const eol = s.indexOf('\n', lastIdx);
      s = s.slice(0, eol + 1) + 'app.register(jobsBoot);\n' + s.slice(eol + 1);
    } else {
      s += '\napp.register(jobsBoot);\n';
    }
  } else {
    // put back a single one at the end of registrations
    const lastIdx = s.lastIndexOf('app.register(');
    if (lastIdx !== -1) {
      const eol = s.indexOf('\n', lastIdx);
      s = s.slice(0, eol + 1) + 'app.register(jobsBoot);\n' + s.slice(eol + 1);
    } else {
      s += '\napp.register(jobsBoot);\n';
    }
  }

  await writeText(p, s);
}

async function main(){
  await patchFeed();
  await patchServer();
  console.info('API patches applied ✔');
}

main().catch((e) => {
  console.error('Patch failed:', e);
  process.exit(1);
});
