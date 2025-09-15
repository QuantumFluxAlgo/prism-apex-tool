import { promises as fs } from 'fs';
import path from 'path';

const root = process.cwd();
const pkgsDir = path.join(root, 'packages');

const readJson = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const writeJson = async (p, obj) => {
  const s = JSON.stringify(obj, null, 2) + "\n";
  await fs.writeFile(p, s, 'utf8');
};

const ensureDistExports = (pkgJson) => {
  // baseline fields
  pkgJson.main  = 'dist/index.js';
  pkgJson.types = 'dist/index.d.ts';
  pkgJson.files = Array.isArray(pkgJson.files) ? Array.from(new Set([...pkgJson.files, 'dist'])) : ['dist'];

  // baseline export
  const base = {
    types: './dist/index.d.ts',
    import: './dist/index.js',
    require: './dist/index.cjs',
    default: './dist/index.js',
  };
  pkgJson.exports = pkgJson.exports || {};
  pkgJson.exports['.'] = { ...pkgJson.exports['.'], ...base };
};

const addSubpathExportsIfNeeded = (name, pkgJson) => {
  // Add known subpath exports used by the API
  if (name.endsWith('/clients-tradovate')) {
    pkgJson.exports = pkgJson.exports || {};
    pkgJson.exports['./telemetry'] = {
      types: './dist/telemetry.d.ts',
      import: './dist/telemetry.js',
      require: './dist/telemetry.cjs',
      default: './dist/telemetry.js',
    };
  }
  if (name.endsWith('/metrics')) {
    pkgJson.exports = pkgJson.exports || {};
    pkgJson.exports['./consistency'] = {
      types: './dist/consistency.d.ts',
      import: './dist/consistency.js',
      require: './dist/consistency.cjs',
      default: './dist/consistency.js',
    };
  }
};

const run = async () => {
  const entries = await fs.readdir(pkgsDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(pkgsDir, ent.name);
    const pj = path.join(dir, 'package.json');
    try {
      await fs.access(pj);
    } catch {
      continue;
    }
    const pkg = await readJson(pj);
    // only touch your scoped internal packages
    if (!pkg.name || !pkg.name.startsWith('@prism-apex/')) continue;

    ensureDistExports(pkg);
    addSubpathExportsIfNeeded(pkg.name, pkg);
    await writeJson(pj, pkg);
    console.info('updated', pkg.name);
  }
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
