#!/usr/bin/env bash
set -euo pipefail
docker run --rm -v "$PWD":/ws -w /ws node:20-bullseye /bin/bash -lc '
  corepack enable
  pnpm install --frozen-lockfile
  pnpm lint
  pnpm typecheck
  pnpm test -w
'
