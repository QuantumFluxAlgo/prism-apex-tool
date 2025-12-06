#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PHASE 3 DOCS ALIGNMENT ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo "Repo root: $REPO_ROOT"
echo

DASHBOARD_PLAN="docs/PRISM_APEX_V2_DASHBOARD_PLAN.md"
REPO_INDEX="docs/REPO_INDEX_V2.md"

if [[ ! -f "$DASHBOARD_PLAN" ]]; then
  echo "ERROR: $DASHBOARD_PLAN not found. Are you in the right repo?"
  exit 1
fi

if [[ ! -f "$REPO_INDEX" ]]; then
  echo "ERROR: $REPO_INDEX not found. Are you in the right repo?"
  exit 1
fi

echo "--- Aligning PRISM_APEX_V2_DASHBOARD_PLAN.md (Phase 3 snapshot) ---"

python3 <<'PY'
from pathlib import Path

dashboard_plan = Path("docs/PRISM_APEX_V2_DASHBOARD_PLAN.md")
repo_index = Path("docs/REPO_INDEX_V2.md")

if not dashboard_plan.exists():
    raise SystemExit(f"Missing {dashboard_plan}")
if not repo_index.exists():
    raise SystemExit(f"Missing {repo_index}")

# 1) Insert Phase 3 snapshot under the EPIC list (idempotent)
plan_text = dashboard_plan.read_text(encoding="utf-8")

phase_marker = "Phase 3 (Dec 2025 snapshot)"
epic_v27_marker = " EPIC V2.7 – Dockerised Deployment & Environments"

if phase_marker in plan_text:
    print("• Dashboard plan already contains Phase 3 snapshot; skipping insertion.")
else:
    idx = plan_text.find(epic_v27_marker)
    if idx == -1:
        print("WARN: Could not find EPIC V2.7 marker in dashboard plan; no Phase 3 block inserted.")
    else:
        insert_pos = idx + len(epic_v27_marker)
        snippet = (
            "\n\nPhase 3 (Dec 2025 snapshot)\n"
            "- Tickets V2 page implemented as canonical A2 surface using fetchTickets + useTicketsHistory.\n"
            "- Dashboard helper fetchJson hardened to tolerate mock responses (tests now exercise real /api/tickets flow).\n"
        )
        plan_text = plan_text[:insert_pos] + snippet + plan_text[insert_pos:]
        dashboard_plan.write_text(plan_text, encoding="utf-8")
        print("• Inserted Phase 3 snapshot block into dashboard plan.")

# 2) Update REPO_INDEX_V2.md: Tickets line + hooks/useTicketsHistory bullet (idempotent)
index_text = repo_index.read_text(encoding="utf-8")

old_tickets_line = "Tickets.tsx – Tickets / audit surface.\n"
new_tickets_line = (
    "Tickets.tsx – Tickets / audit surface (A2). Uses useTicketsHistory + "
    "fetchTickets(...) to pull canonical ticket history via /api/tickets, "
    "including audit fields (completedBy, notes, risk decision, session metrics).\n"
)

if "Tickets / audit surface (A2)." in index_text:
    print("• Repo index Tickets.tsx line already updated; skipping replacement.")
else:
    if old_tickets_line in index_text:
        index_text = index_text.replace(old_tickets_line, new_tickets_line)
        print("• Updated Tickets.tsx description in repo index.")
    else:
        print("WARN: Tickets.tsx line not found in repo index; no replacement done.")

hooks_marker = "hooks/ – React hooks for data fetching, polling, and state.\n"
hook_bullet = (
    "  - useTicketsHistory.ts – Canonical tickets history hook over /api/tickets "
    "(date range, symbol, strategy, status, search).\n"
)

if "useTicketsHistory.ts – Canonical tickets history hook over /api/tickets" in index_text:
    print("• Repo index already contains useTicketsHistory.ts bullet; skipping insertion.")
else:
    idx = index_text.find(hooks_marker)
    if idx == -1:
        print("WARN: hooks/ section not found in repo index; cannot insert useTicketsHistory bullet.")
    else:
        insert_pos = idx + len(hooks_marker)
        index_text = index_text[:insert_pos] + hook_bullet + index_text[insert_pos:]
        print("• Inserted useTicketsHistory.ts bullet under hooks/ section in repo index.")

repo_index.write_text(index_text, encoding="utf-8")
PY

echo
echo "--- Git diff (docs only) ---"
git diff -- docs/PRISM_APEX_V2_DASHBOARD_PLAN.md docs/REPO_INDEX_V2.md || true
echo

# Decide whether to commit
if git diff --quiet -- docs/PRISM_APEX_V2_DASHBOARD_PLAN.md docs/REPO_INDEX_V2.md; then
  echo "No doc changes detected; nothing to commit."
  exit 0
fi

echo "--- Staging and committing docs alignment ---"
git add \
  docs/PRISM_APEX_V2_DASHBOARD_PLAN.md \
  docs/REPO_INDEX_V2.md \
  scripts/v2_phase3_docs_alignment.sh

git commit -m "V2 Phase 3: Tickets docs alignment and repo index update" || {
  echo "Commit failed (possibly empty or conflicts). Please resolve manually."
  exit 1
}

echo
echo "=== DONE: V2 Phase 3 docs aligned and committed. ==="
