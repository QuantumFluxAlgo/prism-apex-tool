#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PHASE 3 WORKLIST/TICKETS DOCS ALIGNMENT ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found on PATH. Install Python 3 or adjust this script to use another interpreter."
  exit 1
fi

echo
echo "--- Updating PRISM_APEX_V2_DASHBOARD_PLAN.md (Phase 3 snapshot) ---"
python3 <<'PY'
import pathlib

path = pathlib.Path("docs/PRISM_APEX_V2_DASHBOARD_PLAN.md")
text = path.read_text(encoding="utf-8")

needle = """Phase 3 (Dec 2025 snapshot)
- Tickets V2 page implemented as canonical A2 surface using fetchTickets + useTicketsHistory.
- Dashboard helper fetchJson hardened to tolerate mock responses (tests now exercise real /api/tickets flow).
"""
extra = "- Worklist V2 now consumes canonical tickets via fetchWorklistCanonicalTickets(...) wrapper over /api/tickets; Tickets and Analytics share the same CanonicalTicket mapping from TicketRow.\n"

if extra.strip() in text:
    print("• Phase 3 snapshot already mentions Worklist/Tickets canonical cohesion.")
elif needle in text:
    text = text.replace(needle, needle + extra)
    path.write_text(text, encoding="utf-8")
    print("• Updated Phase 3 snapshot block with Worklist/Tickets canonical note.")
else:
    print("! Phase 3 snapshot pattern not found; no change applied.")
PY

echo
echo "--- Updating REPO_INDEX_V2.md (lib/api + Worklist description) ---"
python3 <<'PY'
import pathlib

path = pathlib.Path("docs/REPO_INDEX_V2.md")
text = path.read_text(encoding="utf-8")

# 1) Document lib/api.ts canonical helpers under lib/ section
needle_lib = """lib/ – API client wrappers and DTOs.
hooks/ – React hooks for data fetching, polling, and state.
  - useTicketsHistory.ts – Canonical tickets history hook over /api/tickets (date range, symbol, strategy, status, search).
utils/ – Formatting and convenience utilities.
"""
replacement_lib = """lib/ – API client wrappers and DTOs.
  - api.ts – Canonical tickets API helpers (fetchTickets, fetchWorklistCanonicalTickets, fetchAnalyticsCanonicalTickets, buildCanonicalTicketFromRow, session metrics helpers).
hooks/ – React hooks for data fetching, polling, and state.
  - useTicketsHistory.ts – Canonical tickets history hook over /api/tickets (date range, symbol, strategy, status, search).
utils/ – Formatting and convenience utilities.
"""

if "api.ts – Canonical tickets API helpers" in text:
    print("• lib/api.ts canonical helpers already documented.")
elif needle_lib in text:
    text = text.replace(needle_lib, replacement_lib)
    print("• Documented api.ts canonical helpers under lib/ section.")
else:
    print("! lib/hooks/utils block pattern not found; no change applied for lib/ section.")

# 2) Enrich WorklistV2 description to mention canonical feed
needle_worklist = "WorklistV2.tsx – Worklist V2 execution page (live signals, scoring, detail panel).\n"
replacement_worklist = "WorklistV2.tsx – Worklist V2 execution page (live signals, scoring, detail panel). Uses fetchWorklistCanonicalTickets(...) over /api/tickets to load CanonicalTicket rows.\n"

if "Uses fetchWorklistCanonicalTickets(...)" in text:
    print("• WorklistV2 canonical feed already mentioned.")
elif needle_worklist in text:
    text = text.replace(needle_worklist, replacement_worklist)
    print("• Updated WorklistV2 description with canonical feed details.")
else:
    print("! WorklistV2 description pattern not found; no change applied for Worklist section.")

path.write_text(text, encoding="utf-8")
PY

echo
echo "--- Git diff (docs only) ---"
git diff -- docs/PRISM_APEX_V2_DASHBOARD_PLAN.md docs/REPO_INDEX_V2.md || true

echo
echo "--- Staging and committing docs alignment ---"
git add docs/PRISM_APEX_V2_DASHBOARD_PLAN.md docs/REPO_INDEX_V2.md || true
if git diff --cached --quiet; then
  echo "No doc changes to commit."
else
  git commit -m "V2 Phase 3: Worklist/Tickets canonical docs alignment"
fi

echo
echo "=== DONE: Worklist/Tickets docs aligned. ==="
