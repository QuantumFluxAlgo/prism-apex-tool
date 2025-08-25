// Programmatic depcheck runner that respects .depcheckrc.json
/* eslint-disable import/no-extraneous-dependencies, no-console */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import depcheck from 'depcheck';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const cfgPath = path.join(repoRoot, '.depcheckrc.json');
const outDir = path.join(repoRoot, 'reports');
const outPath = path.join(outDir, 'depcheck.json');

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const options = {
  ignoreMatches: cfg.ignores ?? [],
  ignorePatterns: cfg.ignorePatterns ?? [],
  specials: (cfg.specials ?? []).map((name) => {
    // depcheck ships helpers under depcheck.special
    const special = depcheck.special[name];
    if (!special) {
      console.warn(`depcheck: unknown special "${name}", skipping`);
    }
    return special;
  }).filter(Boolean),
};

await fs.promises.mkdir(outDir, { recursive: true });

const result = await new Promise((resolve) => {
  depcheck(repoRoot, options, (res) => resolve(res));
});

fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

// Print a tiny summary for DX
const unused = [
  ...result.dependencies ?? [],
  ...result.devDependencies ?? [],
];
console.log(`depcheck: ${unused.length} unused deps (see reports/depcheck.json)`);
process.exit(0);
