#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

TICKETS_ROUTE="$ROOT/apps/api/src/routes/tickets.ts"
SESSION_ROUTE="$ROOT/apps/api/src/routes/session-metrics.ts"
CANONICAL_DTO="$ROOT/apps/api/src/routes/dto/canonicalTicketView.ts"
QUALITY_FILTERS="$ROOT/apps/api/src/routes/ticketQualityFilters.ts"

echo "=== PRISM APEX — WORKLIST BACKEND CONTRACTS SNAPSHOT ==="
echo "Root: $ROOT"
echo

for f in "$TICKETS_ROUTE" "$SESSION_ROUTE" "$CANONICAL_DTO" "$QUALITY_FILTERS"; do
  if [ -f "$f" ]; then
    echo "---------------------------------------------------------------------"
    echo "FILE: ${f#$ROOT/}"
    echo "---------------------------------------------------------------------"
    cat "$f"
    echo
  else
    echo "MISSING: ${f#$ROOT/} (file not found)"
    echo
  fi
done

echo "=== DONE: backend contracts snapshot complete. ==="
