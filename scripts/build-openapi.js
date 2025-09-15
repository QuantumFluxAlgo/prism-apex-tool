const fs = require('fs');
const specPath = '/runtime/apps/api/dist/openapi/spec.js';
(async () => {
  let mod;
  try { mod = require(specPath); }
  catch { console.info('OpenAPI: spec module not found, skipping.'); process.exit(0); }

  const fns = [
    mod.buildOpenApi,
    mod.buildOpenAPIDocument, mod.buildOpenApiDocument,
    mod.createOpenAPIDocument, mod.createOpenApiDocument,
    mod.buildDocument, mod.generateSpec,
    typeof mod.default === 'function' ? mod.default : null,
  ].filter(Boolean);

  let doc = null;
  for (const fn of fns) {
    try { doc = await fn(); break; } catch { try { doc = fn({}); break; } catch {} }
  }
  if (!doc) {
    const objs = [mod.default, mod.openapi, mod.document, mod.spec].filter(v => v && typeof v === 'object');
    if (objs[0]) doc = objs[0];
  }
  if (!doc) { console.info('OpenAPI: no doc produced; skipping.'); process.exit(0); }

  fs.writeFileSync('/runtime/apps/api/dist/openapi.json', JSON.stringify(doc, null, 2));
  console.info('OpenAPI: wrote /runtime/apps/api/dist/openapi.json');
})();
