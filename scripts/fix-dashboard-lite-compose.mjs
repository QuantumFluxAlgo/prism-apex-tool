import fs from 'fs'
const f = 'docker-compose.dashboard-lite.yml'
let s = fs.readFileSync(f, 'utf8')
let changed = false
if (!/^\s*build:\s*\n\s*context:\s*\.\s*$/m.test(s)) {
  s = s.replace(/build:\s*\n\s*context:[^\n]*\n\s*dockerfile:[^\n]*/m, 'build:\n      context: .\n      dockerfile: apps/dashboard-lite/Dockerfile')
  changed = true
}
if (!/image:\s*prism-apex\/dashboard-lite:local/.test(s)) {
  s = s.replace(/image:\s*[^\n]*/m, 'image: prism-apex/dashboard-lite:local')
  changed = true
}
if (changed) fs.writeFileSync(f, s)
console.log(changed ? 'compose: patched' : 'compose: ok')
