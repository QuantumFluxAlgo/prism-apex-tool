import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = (p) => `${__dirname}/../dist/${p}`;
mkdirSync(dist(''), { recursive: true });
for (const base of ['index', 'schema', 'io', 'vwap', 'replay-yahoo-bars']) {
  const code = readFileSync(`${dist(base)}.js`, 'utf8')
    .replaceAll('export {', 'module.exports = {')
    .replaceAll('export default', 'module.exports.default =');
  writeFileSync(`${dist(base)}.cjs`, code);
}
