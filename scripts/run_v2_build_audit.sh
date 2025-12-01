#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX V2 – BUILD AUDIT ==="
echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
echo "Commit: $(git rev-parse --short HEAD 2>/dev/null || echo '?')"
echo

API_LINT_STATUS=0
API_TS_STATUS=0
DASH_LINT_STATUS=0
DASH_TS_STATUS=0
SCAN_DEAD_STATUS=0

###############################################################################
# 1) apps/api lint
###############################################################################
echo ">>> [1/5] apps/api lint"
if pnpm --filter ./apps/api lint; then
  echo "✅ apps/api lint PASSED"
else
  echo "❌ apps/api lint FAILED"
  API_LINT_STATUS=1
fi
echo

###############################################################################
# 2) apps/api typecheck
###############################################################################
echo ">>> [2/5] apps/api typecheck"
if pnpm --filter ./apps/api typecheck; then
  echo "✅ apps/api typecheck PASSED"
else
  echo "❌ apps/api typecheck FAILED"
  API_TS_STATUS=1
fi
echo

###############################################################################
# 3) apps/dashboard lint
###############################################################################
echo ">>> [3/5] apps/dashboard lint"
if pnpm --filter ./apps/dashboard lint; then
  echo "✅ apps/dashboard lint PASSED"
else
  echo "❌ apps/dashboard lint FAILED"
  DASH_LINT_STATUS=1
fi
echo

###############################################################################
# 4) apps/dashboard typecheck
###############################################################################
echo ">>> [4/5] apps/dashboard typecheck"
if pnpm --filter ./apps/dashboard typecheck; then
  echo "✅ apps/dashboard typecheck PASSED"
else
  echo "❌ apps/dashboard typecheck FAILED"
  DASH_TS_STATUS=1
fi
echo

###############################################################################
# 5) scan:dead (if configured)
###############################################################################
echo ">>> [5/5] pnpm run scan:dead (if available)"
if pnpm run scan:dead; then
  echo "✅ pnpm run scan:dead PASSED"
else
  echo "⚠️ pnpm run scan:dead FAILED or is not configured"
  SCAN_DEAD_STATUS=1
fi
echo

###############################################################################
# SUMMARY + EXIT CODE
###############################################################################
echo "=== PRISM APEX V2 – BUILD AUDIT SUMMARY ==="
echo "apps/api lint:          $([ "$API_LINT_STATUS" -eq 0 ] && echo PASS || echo FAIL)"
echo "apps/api typecheck:     $([ "$API_TS_STATUS" -eq 0 ] && echo PASS || echo FAIL)"
echo "dashboard lint:         $([ "$DASH_LINT_STATUS" -eq 0 ] && echo PASS || echo FAIL)"
echo "dashboard typecheck:    $([ "$DASH_TS_STATUS" -eq 0 ] && echo PASS || echo FAIL)"
echo "scan:dead:              $([ "$SCAN_DEAD_STATUS" -eq 0 ] && echo PASS || echo WARN)"
echo

EXIT_CODE=0

# Strict gates for release:
# - Any lint/typecheck failure => non-zero exit (hard stop for CI/release).
if [ "$API_LINT_STATUS" -ne 0 ] || \
   [ "$API_TS_STATUS" -ne 0 ] || \
   [ "$DASH_LINT_STATUS" -ne 0 ] || \
   [ "$DASH_TS_STATUS" -ne 0 ]; then
  EXIT_CODE=1
fi

if [ "$EXIT_CODE" -ne 0 ]; then
  echo "❌ BUILD AUDIT FAILED – see failures above."
else
  echo "✅ BUILD AUDIT PASSED – all lint/typecheck gates are green (scan:dead may still need attention)."
fi

exit "$EXIT_CODE"
