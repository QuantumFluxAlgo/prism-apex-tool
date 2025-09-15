import { promises as fs } from 'fs';
import path from 'path';

const root = process.cwd();
const pkgsDir = path.join(root, 'packages');

const readJson = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const writeJson = async (p, obj) => fs.writeFile(p, JSON.stringify(obj, null, 2) + "\n", 'utf8');

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function ensureBaseFields(pkgJson) {
  pkgJson.main  = 'dist/index.js';
  pkgJson.types = 'dist/index.d.ts';
  const files = new Set(Array.isArray(pkgJson.files) ? pkgJson.files : []);
  files.add('dist');
  pkgJson.files = Array.from(files);
}

async function fixRootExport(dir, pkgJson) {
  const hasCjs = await fileExists(path.join(dir, 'dist', 'index.cjs'));
  const requirePath = hasCjs ? './dist/index.cjs' : './dist/index.js';
  const base = {
    types: './dist/index.d.ts',
    import: './dist/index.js',
    require: requirePath,
    default: './dist/index.js',
  };
  pkgJson.exports = pkgJson.exports || {};
  pkgJson.exports['.'] = { ...(pkgJson.exports['.'] || {}), ...base };
}

async function fixSubpath(dir, pkgJson, sub, fname) {
  const cjs = path.join(dir, 'dist', `${fname}.cjs`);
  const js  = path.join(dir, 'dist', `${fname}.js`);
  const requirePath = (await fileExists(cjs)) ? `./dist/${fname}.cjs` : `./dist/${fname}.js`;
  const typesPath   = `./dist/${fname}.d.ts`;
  const importPath  = `./dist/${fname}.js`;

  pkgJson.exports = pkgJson.exports || {};
  pkgJson.exports[sub] = {
    types: typesPath,
    import: importPath,
    require: requirePath,
    default: importPath,
  };
}

async function run() {
  const entries = await fs.readdir(pkgsDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(pkgsDir, ent.name);
    const pj = path.join(dir, 'package.json');
    try { await fs.access(pj); } catch { continue; }

    const pkg = await readJson(pj);
    if (!pkg.name || !pkg.name.startsWith('@prism-apex/')) continue;

    ensureBaseFields(pkg);
    await fixRootExport(dir, pkg);

    // Known subpaths used by API:
    if (pkg.name.endsWith('/clients-tradovate')) {
      await fixSubpath(dir, pkg, './telemetry', 'telemetry');
    }
    if (pkg.name.endsWith('/metrics')) {
      await fixSubpath(dir, pkg, './consistency', 'consistency');
    }

    await writeJson(pj, pkg);
    console.log('fixed', pkg.name);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
