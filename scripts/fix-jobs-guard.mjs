import { promises as fs } from 'fs';
import path from 'path';

async function patchFile(p, transform) {
  const s = await fs.readFile(p, 'utf8');
  const t = transform(s);
  if (t !== s) {
    await fs.writeFile(p, t, 'utf8');
    console.log('patched', p);
  } else {
    console.log('no change', p);
  }
}

// 0) env.ts — ensure a tiny compatibility getConfig() exists (don't change your env)
await (async () => {
  const p = 'apps/api/src/config/env.ts';
  try {
    const s = await fs.readFile(p, 'utf8');
    if (!/export\s+(?:const|function)\s+getConfig\b/.test(s)) {
      const add = `

// Compatibility shim for legacy imports
export function getConfig(): any {
  return {
    jobs: { enableFeed: JOBS_ENABLE_FEED },
  };
}
`;
      await fs.writeFile(p, s + add, 'utf8');
      console.log('appended getConfig() shim to', p);
    } else {
      console.log('getConfig() already present in', p);
    }
  } catch (e) {
    console.warn('env.ts not found or unreadable, skipping shim:', e?.message || e);
  }
})();

// 1) feed.ts — remove the unsupported baseUrl property from client env
await (async () => {
  const p = 'apps/api/src/jobs/feed.ts';
  await patchFile(p, (s) => s.replace(/^\s*baseUrl:\s*env\.TRADOVATE_BASE_URL!.*\r?\n/m, ''));
})();

// 2) server.ts — fix health import, remove broken/duplicate bits, keep onReady guard
await (async () => {
  const p = 'apps/api/src/server.ts';
  await patchFile(p, (s) => {
    let t = s;

    // Fix: named -> default import for health route
    t = t.replace(
      /import\s*\{\s*healthRoutes\s*\}\s*from\s*'\.\/routes\/health\.js';/g,
      "import healthRoute from './routes/health.js';"
    );
    // Ensure registration uses the default
    t = t.replace(/register\(\s*healthRoutes\s*\)/g, 'register(healthRoute)');

    // Remove any old/bad imports introduced earlier
    t = t.replace(/^\s*import\s*\{\s*getConfig\s*\}\s*from\s*'\.\/config\/env(?:\.js)?';\s*$/gm, '');
    t = t.replace(/^\s*import\s*\{\s*registerFeedJob\s*\}\s*from\s*'\.\/jobs\/feed\.js';\s*$/gm, '');
    t = t.replace(/^\s*import\s*\{\s*env\s*\}\s*from\s*'\.\/config\/env\.js';\s*$/gm, '');
    t = t.replace(/^\s*import\s*\{\s*JobManager\s*\}\s*from\s*'\.\/lib\/jobManager\.js';\s*$/gm, '');
    t = t.replace(/^\s*import\s*\{\s*FeedJob\s*\}\s*from\s*'\.\/jobs\/feed\.js';\s*$/gm, '');

    // Remove any previously auto-injected static guard block(s)
    t = t.replace(/\/\/\s*---\s*jobs guard \(auto-injected\)[\s\S]*?(?=^\S|$\n?)/gm, '');

    // Remove the stray broken line if present
    t = t.replace(/^[ \t]*app.-zshRoute\);\r?\n?/m, '');

    // Idempotently append the onReady guard if missing
    if (!/app\.addHook\(\s*'onReady'/.test(t)) {
      t += `

// --- jobs guard (onReady) --------------------------------------------
app.addHook('onReady', async () => {
  if (process.env.JOBS_ENABLE_FEED === 'true') {
    try {
      const { jobManager } = await import('./lib/jobManager.js');
      // In this codebase startAll() takes no args; jobs are registered internally.
      await jobManager.startAll();
    } catch (err) {
      app.log.error({ err }, 'job start failed');
    }
  } else {
    app.log.info('feed job disabled: JOBS_ENABLE_FEED=false');
  }
});
`;
    }

    return t;
  });
})();

console.log('All patches applied.');
