#!/usr/bin/env sh
set -eu

# Backup once per run
cp -a Dockerfile "Dockerfile.bak.$(date +%s)"

# Replace any 'pnpm prune --prod' with a script-safe variant
# - --ignore-scripts prevents prepare/postinstall/etc. from running
# - PNPM_SKIP_PREPARE=1 belt-and-braces for monorepos with prepare hooks
tmp="$(mktemp)"
perl -0777 -pe 's/pnpm\s+prune\s+--prod/PNPM_SKIP_PREPARE=1 pnpm prune --prod --ignore-scripts/g' Dockerfile > "$tmp"
mv "$tmp" Dockerfile

echo "Dockerfile patched: prune will skip lifecycle scripts."
