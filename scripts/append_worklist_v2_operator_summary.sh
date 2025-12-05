#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – APPEND WORKLIST V2 OPERATOR SUMMARY ==="

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

DOC="docs/PRISM_APEX_V2_BUILD_AUDIT.md"

echo "--- Repo root: $ROOT"
echo "--- Target doc: $DOC"

if [ ! -f "$DOC" ]; then
  echo "!!! ERROR: $DOC not found. Aborting without changes."
  exit 1
fi

cat <<'MD' >> "$DOC"

## Operator Worklist V2 — Implementation Snapshot

- **Worklist view** — `apps/dashboard/src/pages/WorklistV2.tsx:1` mirrors the full V2 entry (ExecutionShell-aware imports, score helpers, formatting); `apps/dashboard/src/pages/WorklistV2.tsx:253` defines `WorklistV2Content` for fetching/enriching/filtering/rendering tickets; `apps/dashboard/src/pages/WorklistV2.tsx:770` wraps the view inside `<ExecutionShell activeTab="worklist">`.
- **Automation + audit** — `scripts/apply_worklist_v2_execution_shell_wrap.sh:1` backs up/re-generates the page and appends audit entries, producing `apps/dashboard/src/pages/WorklistV2.tsx.bak.*`; `docs/PRISM_APEX_V2_BUILD_AUDIT.md:120` now records the shell integration; `v2_preflight_recon.sh:1` supplies the read-only recon requested ahead of operator changes.
- **Follow-ups** — Run `pnpm lint --filter dashboard --if-present` and `pnpm test --filter dashboard --if-present`, then use your dashboard dev server to visually confirm the Worklist V2 view within the A2 shell.
MD

echo "=== DONE – Summary appended to $DOC ==="
echo "Review with: git diff $DOC"
