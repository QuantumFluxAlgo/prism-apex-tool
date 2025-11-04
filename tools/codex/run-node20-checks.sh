#!/usr/bin/env bash
set -euo pipefail
docker run --rm -v "$PWD":/ws -w /ws node:20-bullseye /bin/bash -lc '
  set -euo pipefail
  corepack enable
  # Make sure git/ca are present for any optional fetches
  apt-get update -y && apt-get install -y --no-install-recommends git ca-certificates >/dev/null 2>&1 || true

  # Allow optional platform binaries to resolve; do not freeze the lockfile for this environment check
  pnpm install

  # Rebuild native/optional bits in all workspaces
  pnpm -r rebuild || true

  echo "== Resolved rollup packages (diagnostic) =="
  pnpm ls rollup --depth 2 || true
  pnpm ls "@rollup/rollup-linux-x64-gnu" --depth 2 || true

  # Lint / typecheck / tests
  pnpm lint
  pnpm typecheck
  pnpm test -w
'
