try {
  const p = require.resolve('@asteasolutions/zod-to-openapi/package.json');
  console.info('zod-to-openapi present at', p);
  process.exit(0);
} catch (e) {
  console.error('zod-to-openapi NOT FOUND');
  console.error(e && e.message ? e.message : e);
  process.exit(2);
}
