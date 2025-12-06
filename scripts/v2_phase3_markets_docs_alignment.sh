#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PHASE 3 MARKETS DOCS ALIGNMENT ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

PLAN_PATH="docs/PRISM_APEX_V2_DASHBOARD_PLAN.md"
INDEX_PATH="docs/REPO_INDEX_V2.md"

if [[ ! -f "$PLAN_PATH" ]]; then
  echo "ERROR: $PLAN_PATH not found"
  exit 1
fi

if [[ ! -f "$INDEX_PATH" ]]; then
  echo "ERROR: $INDEX_PATH not found"
  exit 1
fi

echo
echo "--- Updating PRISM_APEX_V2_DASHBOARD_PLAN.md (Phase 3 snapshot) ---"

python3 <<'PY_PLAN'
from pathlib import Path

plan_path = Path("docs/PRISM_APEX_V2_DASHBOARD_PLAN.md")
text = plan_path.read_text(encoding="utf-8")

orig_block = """Phase 3 (Dec 2025 snapshot)
- Tickets V2 page implemented as canonical A2 surface using fetchTickets + useTicketsHistory.
- Dashboard helper fetchJson hardened to tolerate mock responses (tests now exercise real /api/tickets flow).
- Worklist V2 now consumes canonical tickets via fetchWorklistCanonicalTickets(...) wrapper over /api/tickets; Tickets and Analytics share the same CanonicalTicket mapping from TicketRow.
- Analytics page implemented as canonical A2 surface using fetchAnalyticsCanonicalTickets(...) + fetchSessionMetricsBatch(...); KPIs, PnL-over-time, and regime breakdown share the same CanonicalTicket contract.
"""

markets_line = "- Markets page implemented as canonical session surface using /api/symbols + /api/session-metrics; overlays panel and quality/news cards read from live session metrics payload.\n"

if markets_line.strip() in text:
    print("• Markets bullet already present; no change needed.")
else:
    if orig_block not in text:
        raise SystemExit("Phase 3 block not found; won't rewrite plan doc.")
    new_block = orig_block + markets_line
    text = text.replace(orig_block, new_block)
    plan_path.write_text(text, encoding="utf-8")
    print("• Inserted Markets bullet into Phase 3 snapshot.")
PY_PLAN

echo
echo "--- Updating REPO_INDEX_V2.md (MarketData page description) ---"

python3 <<'PY_INDEX'
from pathlib import Path

index_path = Path("docs/REPO_INDEX_V2.md")
text = index_path.read_text(encoding="utf-8")

orig = "MarketData.tsx – Markets/market context cockpit."
new = "MarketData.tsx – Markets/market context cockpit (canonical). Uses /api/symbols and /api/session-metrics to drive the session overlays panel and quality/news context."

if new in text:
    print("• MarketData.tsx description already canonical; no change needed.")
elif orig in text:
    text = text.replace(orig, new)
    index_path.write_text(text, encoding="utf-8")
    print("• Updated MarketData.tsx description under canonical pages.")
else:
    raise SystemExit("MarketData.tsx line not found in REPO_INDEX_V2.md.")
PY_INDEX

echo
echo "--- Git diff (docs only) ---"
git diff -- docs/PRISM_APEX_V2_DASHBOARD_PLAN.md docs/REPO_INDEX_V2.md || true

echo
echo "--- Staging and committing Markets docs alignment ---"
git add docs/PRISM_APEX_V2_DASHBOARD_PLAN.md docs/REPO_INDEX_V2.md "$0" || true
if git diff --cached --quiet; then
  echo "• No staged changes; commit skipped."
else
  git commit -m "V2 Phase 3: Markets docs alignment (canonical session surface)" || {
    echo "• Commit failed (possibly empty); continuing."
  }
fi

echo
echo "=== DONE: Markets docs aligned. ==="
