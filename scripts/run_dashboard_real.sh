#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "=== PRISM APEX — REAL STACK DASHBOARD VALIDATION (LOCAL APPS/*) ==="
echo "Root: $ROOT"
echo

# Sanity checks on Worklist V2 wiring (non-fatal)
if [ -x "$ROOT/scripts/check_worklist_v2_status.sh" ]; then
  echo "--- Running: scripts/check_worklist_v2_status.sh ---"
  "$ROOT/scripts/check_worklist_v2_status.sh" || true
  echo
fi

if [ -x "$ROOT/scripts/ensure_worklist_v2_route.sh" ]; then
  echo "--- Running: scripts/ensure_worklist_v2_route.sh ---"
  "$ROOT/scripts/ensure_worklist_v2_route.sh" || true
  echo
fi

start_api() {
  echo "=== Starting API from apps/api ==="
  cd "$ROOT/apps/api"

  if command -v pnpm >/dev/null 2>&1 && [ -f "package.json" ]; then
    echo "[api] Trying: pnpm dev (apps/api)"
    pnpm dev && return 0 || echo "[api] pnpm dev failed"

    echo "[api] Trying: pnpm start (apps/api)"
    pnpm start && return 0 || echo "[api] pnpm start failed"
  fi

  if command -v npm >/dev/null 2>&1 && [ -f "package.json" ]; then
    echo "[api] Trying: npm run dev (apps/api)"
    npm run dev && return 0 || echo "[api] npm run dev failed"

    echo "[api] Trying: npm start (apps/api)"
    npm start && return 0 || echo "[api] npm start failed"
  fi

  echo "ERROR: Could not start API from apps/api with known commands. Start it manually, then run this script again but comment out start_api." >&2
  return 1
}

start_dashboard() {
  echo "=== Starting Dashboard from apps/dashboard ==="
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

echo
echo "=== BOOTING REAL STACK (apps/api + apps/dashboard) ==="
echo "API:       http://localhost:3000"
echo "Dashboard: http://localhost:5173/worklist-v2"
echo

cd "$ROOT"

# Start API in background
start_api &
API_PID=$!

# Give API a head-start
sleep 5 || true

# Start dashboard in background (so we can trap its exit)
start_dashboard &
DASH_PID=$!

# Wait for dashboard to exit
wait "$DASH_PID" || true

# Kill API if still running
if kill -0 "$API_PID" >/dev/null 2>&1; then
  echo
  echo "Stopping API process (PID: $API_PID)…"
  kill "$API_PID" 2>/dev/null || true
fi

echo
echo "=== REAL STACK DASHBOARD SESSION ENDED ==="
