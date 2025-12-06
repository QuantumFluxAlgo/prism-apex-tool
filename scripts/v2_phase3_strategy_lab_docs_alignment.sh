#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PHASE 3 STRATEGY LAB DOCS ALIGNMENT ==="

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

base_block = """Phase 3 (Dec 2025 snapshot)
- Tickets V2 page implemented as canonical A2 surface using fetchTickets + useTicketsHistory.
- Dashboard helper fetchJson hardened to tolerate mock responses (tests now exercise real /api/tickets flow).
- Worklist V2 now consumes canonical tickets via fetchWorklistCanonicalTickets(...) wrapper over /api/tickets; Tickets and Analytics share the same CanonicalTicket mapping from TicketRow.
- Analytics page implemented as canonical A2 surface using fetchAnalyticsCanonicalTickets(...) + fetchSessionMetricsBatch(...); KPIs, PnL-over-time, and regime breakdown share the same CanonicalTicket contract.
- Markets page implemented as canonical session surface using /api/symbols + /api/session-metrics; overlays panel and quality/news cards read from live session metrics payload.
"""

lab_line = "- Strategy Lab V2 UI scaffolded as canonical A2 surface using fetchAnalyticsCanonicalTickets(...); lab vs live KPIs and trades preview are driven by the same analytics ticket contract (no order routing).\n"

if lab_line.strip() in text:
    print("• Strategy Lab bullet already present; no change needed.")
else:
    if base_block not in text:
        raise SystemExit("Expected Phase 3 block (with Markets) not found; won't rewrite plan doc.")
    new_block = base_block + lab_line
    text = text.replace(base_block, new_block)
    plan_path.write_text(text, encoding="utf-8")
    print("• Inserted Strategy Lab bullet into Phase 3 snapshot.")
PY_PLAN

echo
echo "--- Updating REPO_INDEX_V2.md (StrategyLab page description) ---"

python3 <<'PY_INDEX'
from pathlib import Path

index_path = Path("docs/REPO_INDEX_V2.md")
text = index_path.read_text(encoding="utf-8")

orig = "StrategyLab.tsx – Strategy Lab (config, backtest, lab vs live)."
new = (
    "StrategyLab.tsx – Strategy Lab (config, backtest, lab vs live). "
    "Uses fetchAnalyticsCanonicalTickets(...) to drive lab vs live KPIs and the trades preview over the canonical analytics ticket feed (front-end only; no order routing)."
)

if new in text:
    print("• StrategyLab.tsx description already canonical; no change needed.")
elif orig in text:
    text = text.replace(orig, new)
    index_path.write_text(text, encoding="utf-8")
    print("• Updated StrategyLab.tsx description under canonical pages.")
else:
    raise SystemExit("StrategyLab.tsx line not found in REPO_INDEX_V2.md.")
PY_INDEX

echo
echo "--- Git diff (docs only) ---"
git diff -- docs/PRISM_APEX_V2_DASHBOARD_PLAN.md docs/REPO_INDEX_V2.md || true

echo
echo "--- Staging and committing Strategy Lab docs alignment ---"
git add docs/PRISM_APEX_V2_DASHBOARD_PLAN.md docs/REPO_INDEX_V2.md "$0" || true
if git diff --cached --quiet; then
  echo "• No staged changes; commit skipped."
else
  git commit -m "V2 Phase 3: Strategy Lab docs alignment (canonical analytics surface)" || {
    echo "• Commit failed (possibly empty); continuing."
  }
fi

echo
echo "=== DONE: Strategy Lab docs aligned. ==="
