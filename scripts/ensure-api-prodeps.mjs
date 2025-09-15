import { promises as fs } from 'fs';
import path from 'path';

const root = process.cwd();
const apiDir = path.join(root, 'apps', 'api');
const apiPkgPath = path.join(apiDir, 'package.json');

const readJson = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const writeJson = async (p, obj) => fs.writeFile(p, JSON.stringify(obj, null, 2) + "\n", 'utf8');

const scanImports = async (dir) => {
  const found = new Set();
  async function walk(d) {
    const ents = await fs.readdir(d, { withFileTypes: true });
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (/\.(ts|js|mts|cts)$/.test(e.name)) {
        const text = await fs.readFile(p, 'utf8');
        const re = /@prism-apex\/[a-z0-9-]+(?:\/[a-z0-9-]+)?/gi;
        let m;
        while ((m = re.exec(text))) {
          // only the package root goes into dependencies
          const scoped = m[0].split('/').slice(0, 2).join('/');
          found.add(scoped);
        }
      }
    }
  }
  await walk(dir);
  return Array.from(found);
};

const run = async () => {
  const imports = await scanImports(path.join(apiDir, 'src'));
  const apiPkg = await readJson(apiPkgPath);

  apiPkg.dependencies = apiPkg.dependencies || {};
  apiPkg.devDependencies = apiPkg.devDependencies || {};

  for (const name of imports) {
    // move from devDependencies to dependencies or add if missing
    if (apiPkg.devDependencies[name]) {
      apiPkg.dependencies[name] = apiPkg.devDependencies[name];
      delete apiPkg.devDependencies[name];
    } else if (!apiPkg.dependencies[name]) {
      apiPkg.dependencies[name] = 'workspace:*';
    }
  }

  await writeJson(apiPkgPath, apiPkg);
  console.log('API dependencies updated:', imports.join(', '));
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
