import fs from 'node:fs';
const s = fs.readFileSync('apps/api/src/server.ts','utf8');

const hasImport = /import\s+jobsBoot\s+from\s+'\.\/jobs\/boot\.js';/.test(s);
const regCount = (s.match(/app\.register\(\s*jobsBoot\s*\)/g) || []).length;

if (!hasImport) {
  console.error('verify: missing "import jobsBoot from ./jobs/boot.js" in server.ts');
  process.exit(1);
}
if (regCount !== 1) {
  console.error(`verify: expected exactly one app.register(jobsBoot); found ${regCount}`);
  process.exit(1);
}
console.info('verify: jobsBoot import/registration OK');
