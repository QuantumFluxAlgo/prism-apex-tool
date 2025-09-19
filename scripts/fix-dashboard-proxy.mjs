import fs from 'fs';

function patchVite() {
  const p = 'apps/dashboard/vite.config.ts';
  let s = fs.readFileSync(p, 'utf8');
  const rx = /['"]\/tickets['"]\s*:\s*\{\s*target:\s*API,\s*changeOrigin:\s*true\s*\},?/m;
  const repl = `'/api': { target: API, changeOrigin: true, rewrite: (p) => p.replace(/^\\/api/, '') },`;
  if (rx.test(s)) {
    s = s.replace(rx, repl);
    fs.writeFileSync(p, s);
    console.log('vite.config.ts: OK');
  } else {
    console.log('vite.config.ts: no /tickets proxy found');
  }
}

function patchApiTs() {
  const p = 'apps/dashboard/src/lib/api.ts';
  if (!fs.existsSync(p)) return console.log('api.ts: missing');
  let s = fs.readFileSync(p, 'utf8');
  const t = s.replace(/\/tickets\?/g, '/api/tickets?');
  if (t !== s) { fs.writeFileSync(p, t); console.log('api.ts: OK'); }
  else { console.log('api.ts: already patched'); }
}

function patchExport() {
  const p = 'apps/dashboard/src/pages/Tickets.tsx';
  if (!fs.existsSync(p)) return console.log('Tickets.tsx: missing');
  let s = fs.readFileSync(p, 'utf8');
  const t = s.replace(/\/export\/tickets\?/g, '/api/export/tickets?');
  if (t !== s) { fs.writeFileSync(p, t); console.log('Tickets.tsx: OK'); }
  else { console.log('Tickets.tsx: already patched'); }
}

patchVite();
patchApiTs();
patchExport();
