'use strict';
const path = require('node:path');

function loadServerModule() {
  // 1) Deployed image via `pnpm deploy`: module is inside node_modules
  try { return require('@prism-apex/api/dist/server.cjs'); } catch (_) {}

  // 2) Local dev fallback: relative to this file (when running from repo)
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
