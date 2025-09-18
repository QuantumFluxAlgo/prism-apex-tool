'use strict';
const { buildServer } = require('./dist/server.cjs');

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
