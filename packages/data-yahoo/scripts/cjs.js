import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

mkdirSync(distDir, { recursive: true });

for (const base of ['index', 'schema', 'io', 'vwap', 'replay-yahoo-bars']) {
  const inputPath = join(distDir, `${base}.js`);
  const code = readFileSync(inputPath, 'utf8')
    .replaceAll('export {', 'module.exports = {')
    .replaceAll('export default', 'module.exports.default =');
  const outputPath = join(distDir, `${base}.cjs`);
  writeFileSync(outputPath, code);
}
