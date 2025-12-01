#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "=== PRISM APEX — WORKLIST V2 MOCK-ONLY DASHBOARD (apps/dashboard) ==="
echo "Root: $ROOT"
echo
echo "IMPORTANT:"
echo "  • Do NOT start the API for this run."
echo "  • Worklist V2 will fall back to getWorklistV2CanonicalTickets()"
echo "    when /api/tickets fails, so you see the pure mock view."
echo
echo "When the dashboard is up, open:  http://localhost:3000/worklist-v2"
echo

start_dashboard() {
  echo "=== Starting Dashboard from apps/dashboard (mock-only, no API) ==="
  cd "$ROOT/apps/dashboard"

  if command -v pnpm >/dev/null 2>&1 && [ -f "package.json" ]; then
    echo "[dashboard] Trying: pnpm dev (apps/dashboard)"
    pnpm dev && return 0 || echo "[dashboard] pnpm dev failed"

    echo "[dashboard] Trying: pnpm start (apps/dashboard)"
    pnpm start && return 0 || echo "[dashboard] pnpm start failed"
  fi

  if command -v npm >/dev/null 2>&1 && [ -f "package.json" ]; then
    echo "[dashboard] Trying: npm run dev (apps/dashboard)"
    npm run dev && return 0 || echo "[dashboard] npm run dev failed"

    echo "[dashboard] Trying: npm start (apps/dashboard)"
    npm start && return 0 || echo "[dashboard] npm start failed"
  fi

  echo "ERROR: Could not start dashboard from apps/dashboard with known commands. Run your usual dashboard dev command manually." >&2
  return 1
}

start_dashboard

echo
echo "=== MOCK-ONLY DASHBOARD SESSION ENDED ==="
