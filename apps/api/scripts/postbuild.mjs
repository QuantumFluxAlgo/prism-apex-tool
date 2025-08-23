import fs from 'fs';
import path from 'path';

const SRC = path.resolve('src');
const DIST = path.resolve('dist');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function walk(dir, root) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      walk(p, root);
    } else {
      // copy any non-TS/TSX files (e.g., .mjs, .js, .json)
      if (!name.endsWith('.ts') && !name.endsWith('.tsx')) {
        const rel = path.relative(root, p);
        const out = path.join(DIST, rel);
        ensureDir(path.dirname(out));
        fs.copyFileSync(p, out);
      }
    }
  }
}

ensureDir(DIST);
ensureDir(path.join(DIST, 'routes'));
ensureDir(path.join(DIST, 'plugins'));

if (fs.existsSync(SRC)) {
  walk(SRC, SRC);
  console.log('✅ postbuild: ensured dist/routes & dist/plugins and copied non-TS files.');
} else {
  console.log('ℹ️ postbuild: no src/ found to copy from.');
}
