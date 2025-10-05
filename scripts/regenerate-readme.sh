#!/usr/bin/env bash
set -euo pipefail
node -e 'console.log("Generating README from repo state…")' >/dev/null
if [ -f apps/tools/readme-gen.ts ]; then
  pnpm -w install --ignore-scripts >/dev/null 2>&1 || true
  pnpm -C apps/tools build >/dev/null 2>&1 || true
  node apps/tools/dist/readme-gen.js > README.md
fi
echo "[readme] ready: README.md"
