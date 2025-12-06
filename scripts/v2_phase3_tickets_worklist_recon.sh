#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – PHASE 3 RECON: TICKETS + WORKLIST V2 ==="
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"
echo "Repo root: $REPO_ROOT"
echo

echo "=== GIT STATUS (SHORT) ==="
git status -sb || true
echo

echo "=== DASHBOARD PAGES (LIST) ==="
ls -1 apps/dashboard/src/pages || echo "apps/dashboard/src/pages MISSING"
echo

# Small helper to print files safely
show_file() {
  local label="$1"
  local path="$2"
  echo "--- $label ($path) ---"
  if [ -f "$path" ]; then
    sed -n '1,260p' "$path"
    local lines
    lines="$(wc -l < "$path" || echo 0)"
    if [ "$lines" -gt 260 ]; then
      echo
      echo "... [$lines total lines, truncated at 260] ..."
    fi
  else
    echo "MISSING: $path"
  fi
  echo
}

echo "=== CORE V2 PAGES (HEADS) ==="
show_file "Worklist V2 page" "apps/dashboard/src/pages/WorklistV2.tsx"
show_file "Tickets page" "apps/dashboard/src/pages/Tickets.tsx"
show_file "Analytics page" "apps/dashboard/src/pages/Analytics.tsx"
show_file "Markets page" "apps/dashboard/src/pages/MarketData.tsx"
echo

echo "=== CORE UI SHELL / COMPONENTS (HEADS) ==="
show_file "ExecutionShell layout" "apps/dashboard/src/layouts/ExecutionShell.tsx"
show_file "DataTable component" "apps/dashboard/src/ui/DataTable.tsx"
show_file "FiltersBar component" "apps/dashboard/src/ui/FiltersBar.tsx"
show_file "Badge component" "apps/dashboard/src/ui/Badge.tsx"
echo

echo "=== WORKLIST MOCK & LIB API (HEADS) ==="
show_file "Worklist V2 mock tickets" "apps/dashboard/src/lib/worklistMock.ts"
show_file "Dashboard lib api" "apps/dashboard/src/lib/api.ts"
echo

echo "=== DASHBOARD TESTS (Tickets / App) ==="
ls -1 apps/dashboard/src/__tests__ || echo "apps/dashboard/src/__tests__ MISSING"
echo
show_file "Tickets tests" "apps/dashboard/src/__tests__/Tickets.test.tsx"
show_file "App tests" "apps/dashboard/src/__tests__/App.test.tsx"
echo

echo "=== OTHER TICKET-RELATED TESTS (grep) ==="
echo "--- grep -R \"Ticket\" apps/dashboard/src/__tests__ ---"
grep -R --line-number "Ticket" apps/dashboard/src/__tests__ || echo "No extra Ticket mentions found."
echo

echo "=== DOCS – V2 DASHBOARD & UI SPECS (HEADS) ==="
show_file "V2 dashboard plan" "docs/PRISM_APEX_V2_DASHBOARD_PLAN.md"
show_file "Tickets UI spec (if present)" "docs/ui/specs/tickets.md"
show_file "Worklist UI spec (if present)" "docs/ui/specs/worklist.md"
echo

echo "=== DOCS – CLASSIFICATION AND REPO INDEX (HEADS) ==="
show_file "Docs classification" "docs/DOCS_CLASSIFICATION_V2.md"
show_file "Repo index V2" "docs/REPO_INDEX_V2.md"
echo

echo "=== API ROUTES – TICKETS & ANALYTICS (LIST) ==="
if [ -d "apps/api/src/routes" ]; then
  ls -1 apps/api/src/routes | grep -E "ticket|Ticket|analytics|session|symbol" || echo "No ticket/analytics/session/symbol routes matched."
else
  echo "apps/api/src/routes directory missing."
fi
echo

echo "=== API ROUTES – CANDIDATES (HEADS) ==="
show_file "Tickets API route (if present)" "apps/api/src/routes/tickets.ts"
show_file "Tickets live route (if present)" "apps/api/src/routes/tickets.live.ts"
show_file "Tickets history route (if present)" "apps/api/src/routes/tickets.history.ts"
show_file "Analytics tickets route (if present)" "apps/api/src/routes/analytics.tickets.ts"
show_file "Session metrics route (if present)" "apps/api/src/routes/session-metrics.ts"
echo

echo "=== PHASE 3 RECON COMPLETE – paste everything above back into ChatGPT ==="
