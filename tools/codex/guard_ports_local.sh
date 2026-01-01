#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

fail() { echo "❌ guard_ports_local: $*" >&2; exit 1; }
ok() { echo "✅ $*"; }

ACTIVE_FILES=(
  "docker-compose.v2.local.yml"
  "LOCAL_DEV.md"
  "PORTS.md"
)

for f in "${ACTIVE_FILES[@]}"; do
  [[ -f "$f" ]] || fail "missing required file: $f"
done

RG_GLOBS=(
  --glob '!ops/legacy-compose/**'
  --glob '!node_modules/**'
  --glob '!.git/**'
  --glob '!exports/**'
  --glob '!tmp/**'
)

DISALLOWED_HOST_PORTS_REGEX='(^|[^0-9])"(3000|5173|8080|8180|5432|55433):|(^|[^0-9])(3000|5173|8080|8180|5432|55433):'
DISALLOWED_VITE_BASE_REGEX='VITE_API_BASE:\s*"?http://(localhost|127\\.0\\.0\\.1):3000'

if rg -n --hidden --no-ignore-vcs "${RG_GLOBS[@]}" -S "$DISALLOWED_HOST_PORTS_REGEX" docker-compose.v2.local.yml >/dev/null; then
  rg -n --hidden --no-ignore-vcs "${RG_GLOBS[@]}" -S "$DISALLOWED_HOST_PORTS_REGEX" docker-compose.v2.local.yml >&2 || true
  fail "docker-compose.v2.local.yml exposes disallowed host ports. Local must be 5180-only."
fi
ok "docker-compose.v2.local.yml does not expose forbidden host ports (3000/5173/8080/8180/5432/55433)."

if rg -n --hidden --no-ignore-vcs "${RG_GLOBS[@]}" -S "$DISALLOWED_VITE_BASE_REGEX" docker-compose.v2.local.yml >/dev/null; then
  rg -n --hidden --no-ignore-vcs "${RG_GLOBS[@]}" -S "$DISALLOWED_VITE_BASE_REGEX" docker-compose.v2.local.yml >&2 || true
  fail "docker-compose.v2.local.yml bakes VITE_API_BASE to localhost:3000. Must be same-origin (/api)."
fi
ok "docker-compose.v2.local.yml does not bake VITE_API_BASE=localhost:3000."

echo
ok "guard_ports_local finished."
