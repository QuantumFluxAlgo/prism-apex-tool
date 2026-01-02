#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "=== PRISM APEX — WORKLIST / TICKETS / SESSIONMETRICS BACKEND INSPECTION ==="
echo "Root: $ROOT"
echo

API_ROOT="$ROOT/apps/api/src"

echo "--- Key candidate files (routes + services + DTOs) ---"
ls -R "$API_ROOT" 2>/dev/null | sed 's/^/  /' || true
echo

echo "--- Grep: worklist-related routes ---"
grep -Rn "worklist" "$API_ROOT" || echo "No 'worklist' mentions found under apps/api/src"
echo

echo "--- Grep: ticket routes + CanonicalTicket-related types ---"
grep -Rn "tickets" "$API_ROOT/routes" || echo "No 'tickets' route file content found"
echo
grep -Rn "CanonicalTicket" "$API_ROOT" || echo "No 'CanonicalTicket' type found under apps/api/src"
echo

echo "--- Grep: SessionMetrics DTO / services ---"
grep -Rn "SessionMetrics" "$API_ROOT" || echo "No 'SessionMetrics' symbol found under apps/api/src"
echo

echo "--- Grep: endpoints likely used by dashboard (GET /api/*worklist*, *tickets*, *session-metrics*) ---"
grep -Rn "router.get" "$API_ROOT/routes" | egrep "worklist|ticket|session|metrics" || echo "No matching router.get lines found"
echo

echo "--- Potential DTO definitions (interface .*Dto) ---"
grep -Rn "interface .*Dto" "$API_ROOT" || echo "No *Dto interfaces found"
echo

echo "=== SUGGESTED NEXT STEPS ==="
echo "1) Identify the concrete route(s) returning data consumed by WorklistV2/Tickets/Analytics."
echo "2) Confirm the schema for CanonicalTicket and SessionMetrics (if present)."
echo "3) Decide whether WorklistV2 should call a dedicated /api/worklist or reuse /api/tickets with filters."
echo
echo "Paste the relevant chunks from the above (routes + DTOs) back into ChatGPT so we can align the UI wiring."
