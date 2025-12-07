#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PHASE 3 ANALYTICS DOCS ALIGNMENT ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

DASHBOARD_PLAN="docs/PRISM_APEX_V2_DASHBOARD_PLAN.md"
REPO_INDEX="docs/REPO_INDEX_V2.md"

if [ ! -f "$DASHBOARD_PLAN" ]; then
  echo "ERROR: $DASHBOARD_PLAN not found"
  exit 1
fi

if [ ! -f "$REPO_INDEX" ]; then
  echo "ERROR: $REPO_INDEX not found"
  exit 1
fi

PYTHON_BIN="${PYTHON_BIN:-python3}"

echo
echo "--- Updating PRISM_APEX_V2_DASHBOARD_PLAN.md (Phase 3 snapshot) ---"

"$PYTHON_BIN" <<'PY_PHASE3'
import pathlib

plan_path = pathlib.Path("docs/PRISM_APEX_V2_DASHBOARD_PLAN.md")
text = plan_path.read_text(encoding="utf-8")

worklist_line = (
    "- Worklist V2 now consumes canonical tickets via "
    "fetchWorklistCanonicalTickets(...) wrapper over /api/tickets; "
    "Tickets and Analytics share the same CanonicalTicket mapping from TicketRow."
)

analytics_line = (
    "- Analytics page implemented as canonical A2 surface using "
    "fetchAnalyticsCanonicalTickets(...) + fetchSessionMetricsBatch(...); "
    "KPIs, PnL-over-time, and regime breakdown share the same CanonicalTicket contract."
)

if analytics_line not in text and worklist_line in text:
    text = text.replace(worklist_line, worklist_line + "\n" + analytics_line)
    plan_path.write_text(text, encoding="utf-8")
    print("• Inserted Analytics bullet into Phase 3 snapshot.")
else:
    print("• Phase 3 Analytics bullet already present or Worklist bullet not found; no change.")
PY_PHASE3

echo
echo "--- Updating REPO_INDEX_V2.md (Analytics page description) ---"

"$PYTHON_BIN" <<'PY_INDEX'
import pathlib

index_path = pathlib.Path("docs/REPO_INDEX_V2.md")
text = index_path.read_text(encoding="utf-8")

old_line = "Analytics.tsx – Performance & drift analytics dashboard.\n"
new_line = (
    "Analytics.tsx – Performance & drift analytics dashboard (canonical). "
    "Uses fetchAnalyticsCanonicalTickets(...) + fetchSessionMetricsBatch(...) "
    "to drive KPIs, PnL-over-time, regime breakdown, and the canonical trades table.\n"
)

if new_line.strip() in text:
    print("• Analytics line already in canonical form; no change.")
elif old_line in text:
    text = text.replace(old_line, new_line)
    index_path.write_text(text, encoding="utf-8")
    print("• Updated Analytics.tsx description under canonical pages.")
else:
    print("• Expected Analytics.tsx line not found; no change.")
PY_INDEX

echo
echo "--- Git diff (docs only) ---"
git diff -- "$DASHBOARD_PLAN" "$REPO_INDEX" || true

echo
echo "--- Staging and committing docs alignment ---"
if git diff --quiet -- "$DASHBOARD_PLAN" "$REPO_INDEX"; then
  echo "No doc changes to commit."
else
  git add "$DASHBOARD_PLAN" "$REPO_INDEX"
  git commit -m "V2 Phase 3: Analytics docs alignment (canonical surface)"
fi

echo
echo "=== DONE: Analytics docs aligned. ==="
