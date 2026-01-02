#!/usr/bin/env bash
set -euo pipefail

# PRISM APEX SAFE CLEANUP
# Deletes reproducible artefacts (logs, mock backups) only.
# Tickets, configs, migrations, and source trees are untouched.

ROOT="${1:-$(git rev-parse --show-toplevel)}"
cd "$ROOT"

SAFE_GLOBS=(
  "pages/*.bak"
  "pages/*pre-v2*"
  "pages/*fix-*.bak"
  "pages/*backup*.tsx"
  "markets-mock/*"
  "tickets_dump.csv"
  "tmp/**"
  "logs/**"
  "*.log"
  "reports/removals/**"
)

echo "=== SAFE CLEANUP (artefacts only) ==="
for glob in "${SAFE_GLOBS[@]}"; do
  mapfile -t matches < <(git ls-files -z -o -i --exclude-standard -- "$glob" | tr '\0' '\n')
  if [[ "${#matches[@]}" -eq 0 ]]; then
    continue
  fi
  for path in "${matches[@]}"; do
    echo "[DEL] $path"
    rm -rf "$path"
  done

done

find pages -type d -empty -delete 2>/dev/null || true

echo "Cleanup complete. Verify 'git status' before committing."
