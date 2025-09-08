import {promises as fs} from 'fs';
const p = 'apps/api/package.json';
const pkg = JSON.parse(await fs.readFile(p,'utf8'));
pkg.dependencies = pkg.dependencies || {};
pkg.devDependencies = pkg.devDependencies || {};
if (pkg.devDependencies['@asteasolutions/zod-to-openapi']) {
  pkg.dependencies['@asteasolutions/zod-to-openapi'] = pkg.devDependencies['@asteasolutions/zod-to-openapi'];
  delete pkg.devDependencies['@asteasolutions/zod-to-openapi'];
}
if (!pkg.dependencies['@asteasolutions/zod-to-openapi']) {
  pkg.dependencies['@asteasolutions/zod-to-openapi'] = '^6.0.0';
}
await fs.writeFile(p, JSON.stringify(pkg,null,2) + '\n');
console.log('ensured @asteasolutions/zod-to-openapi in dependencies');
