'use strict';
// eslint-disable-next-line @typescript-eslint/no-require-imports
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-unused-vars
const path = require('node:path');

function loadServerModule() {
  // 1) Deployed image via `pnpm deploy`: module is inside node_modules
// eslint-disable-next-line @typescript-eslint/no-require-imports
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-unused-vars
  try { return require('@prism-apex/api/dist/server.cjs'); } catch (_) { // no-op }

  // 2) Local dev fallback: relative to this file (when running from repo)
// eslint-disable-next-line @typescript-eslint/no-require-imports
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-unused-vars
  try { return require(path.resolve(__dirname, 'dist/server.cjs')); } catch (err) {
    console.error('[api] Cannot locate dist/server.cjs in deployed or local paths:', err);
    process.exit(1);
  }
}

const { buildServer } = loadServerModule();

(async () => {
  const app = buildServer();
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  try {
    await app.listen({ host, port });
    console.log(`[api] listening on http://${host}:${port}`);
  } catch (err) {
    console.error('[api] failed to listen', err);
    process.exit(1);
  }
})();
