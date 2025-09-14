#!/usr/bin/env bash
set -euo pipefail
STAMP="$(date +%Y%m%d-%H%M%S)"
OUTDIR="reports/deadcode/$STAMP"
mkdir -p "$OUTDIR"

echo "==> Running depcheck (unused deps/files) monorepo-wide..."
pnpm run -w scan:dead:deps > "$OUTDIR/depcheck-root.txt" 2>&1 || true

scan_pkg() {
  local dir="$1"
  local rel="${dir#./}"
  local base_out="$OUTDIR/$(echo "$rel" | tr '/\\' '__')"
  echo "---- $rel ----" | tee -a "$OUTDIR/_index.txt"
  if [ -f "$dir/package.json" ]; then
    (cd "$dir" && pnpm run -s scan:dead:deps) > "${base_out}-depcheck.txt" 2>&1 || true
    # ts-prune prefers a tsconfig; try common names
    if [ -f "$dir/tsconfig.json" ] || [ -f "$dir/tsconfig.build.json" ]; then
      (cd "$dir" && pnpm exec ts-prune -p tsconfig.json || pnpm exec ts-prune -p tsconfig.build.json || true) \
        > "${base_out}-tsprune.txt" 2>&1 || true
    else
      echo "No tsconfig.*; skipping ts-prune" > "${base_out}-tsprune.txt"
    fi
    echo "$rel : depcheck=${base_out}-depcheck.txt tsprune=${base_out}-tsprune.txt" >> "$OUTDIR/_index.txt"
  else
    echo "$rel : no package.json" >> "$OUTDIR/_index.txt"
  fi
}

# Walk apps/ and packages/
for d in apps/* packages/*; do
  [ -d "$d" ] || continue
  scan_pkg "$d"
done

# Quick summary: list files that report clear unused deps/exports
echo "==> Summary" > "$OUTDIR/SUMMARY.txt"
grep -RIl "Unused dependencies" "$OUTDIR" || true >> "$OUTDIR/SUMMARY.txt"
grep -RIl "exported but never used" "$OUTDIR" || true >> "$OUTDIR/SUMMARY.txt"

echo "Reports written to $OUTDIR"
