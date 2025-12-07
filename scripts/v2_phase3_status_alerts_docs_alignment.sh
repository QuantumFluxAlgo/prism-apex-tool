#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PHASE 3 STATUS/ALERTS DOCS ALIGNMENT ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

PLAN_PATH="docs/PRISM_APEX_V2_DASHBOARD_PLAN.md"
INDEX_PATH="docs/REPO_INDEX_V2.md"

echo
echo "--- Updating PRISM_APEX_V2_DASHBOARD_PLAN.md (Phase 3 snapshot) ---"

python3 <<'PY'
import os
import re

plan_path = os.path.join("docs", "PRISM_APEX_V2_DASHBOARD_PLAN.md")

with open(plan_path, encoding="utf-8") as f:
    plan = f.read()

phase3_block = """Phase 3 (Dec 2025 snapshot)
- Tickets V2 page implemented as canonical A2 surface using fetchTickets + useTicketsHistory.
- Dashboard helper fetchJson hardened to tolerate mock responses (tests now exercise real /api/tickets flow).
- Worklist V2 now consumes canonical tickets via fetchWorklistCanonicalTickets(...) wrapper over /api/tickets; Tickets and Analytics share the same CanonicalTicket mapping from TicketRow.
- Analytics page implemented as canonical A2 surface using fetchAnalyticsCanonicalTickets(...) + fetchSessionMetricsBatch(...); KPIs, PnL-over-time, and regime breakdown share the same CanonicalTicket contract.
- Markets page implemented as canonical session surface using /api/symbols + /api/session-metrics; overlays panel and quality/news cards read from live session metrics payload.
- Status page implemented as canonical system health surface over engine jobs, external dependencies, and environment flags.
- Alerts page implemented as canonical alerts surface for risk/system/engine/infra events, with severity and lifecycle state.
"""

pattern = r"Phase 3 \(Dec 2025 snapshot\)(?:\n- .*)*"
new_plan = re.sub(pattern, phase3_block.rstrip(), plan, count=1)

if new_plan != plan:
    with open(plan_path, "w", encoding="utf-8") as f:
        f.write(new_plan)
    print("• Updated Phase 3 snapshot block with Status/Alerts bullets.")
else:
    print("• Phase 3 snapshot block already includes Status/Alerts bullets; no change.")

index_path = os.path.join("docs", "REPO_INDEX_V2.md")
with open(index_path, encoding="utf-8") as f:
    index = f.read()

updated = index

updated = updated.replace(
    "Status.tsx – System status/health dashboard.",
    "Status.tsx – System status/health dashboard (canonical). Surfaces engine job status, external dependencies, and environment flags from a unified status feed.",
)

updated = updated.replace(
    "Alerts.tsx – Alerts surface (risk/system/engine alerts).",
    "Alerts.tsx – Alerts surface (canonical). Shows risk/system/engine/infra alerts with severity and lifecycle filters.",
)

if updated != index:
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(updated)
    print("• Updated Status.tsx and Alerts.tsx descriptions under canonical pages.")
else:
    print("• Status/Alerts descriptions already up to date; no change.")
PY

echo
echo "--- Git diff (docs only) ---"
git diff -- "$PLAN_PATH" "$INDEX_PATH" || true

echo
echo "--- Staging and committing Status/Alerts docs alignment ---"
git add "$PLAN_PATH" "$INDEX_PATH" || true
git commit -m "V2 Phase 3: Status/Alerts docs alignment (system health & alerts surfaces)" || echo "• No doc changes to commit (already aligned)."

echo
echo "=== DONE: Status/Alerts docs aligned. ==="
