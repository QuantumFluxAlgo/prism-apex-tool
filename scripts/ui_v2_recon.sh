#!/usr/bin/env bash
set -euo pipefail

cd ~/Projects/prism-apex-tool
cd "$(git rev-parse --show-toplevel)"

echo "=== UI V2 RECON – DESIGN SYSTEM & SHELL ==="

echo
echo "--- Git / Branch Status ---"
git rev-parse --abbrev-ref HEAD || true
git status -sb || true

echo
echo "--- Tailwind / global styles ---"
ls -1 tailwind.* 2>/dev/null || true
ls -1 apps/dashboard/tailwind.* 2>/dev/null || true
ls -1 apps/dashboard/src/index.css apps/dashboard/src/styles 2>/dev/null || true

echo
echo "--- Layouts & primitives ---"
ls -R apps/dashboard/src/layouts 2>/dev/null || echo "no layouts dir"
ls -1 apps/dashboard/src/ui 2>/dev/null || true
sed -n '1,260p' apps/dashboard/src/layouts/ExecutionShell.tsx 2>/dev/null || echo "ExecutionShell.tsx not found"
sed -n '1,220p' apps/dashboard/src/ui/Card.tsx 2>/dev/null || echo "Card.tsx not found"
sed -n '1,220p' apps/dashboard/src/ui/Badge.tsx 2>/dev/null || echo "Badge.tsx not found"

echo
echo "--- V2 pages (Worklist/Tickets/MarketData/Analytics) ---"
sed -n '1,260p' apps/dashboard/src/pages/WorklistV2.tsx 2>/dev/null || echo "WorklistV2.tsx not found"
sed -n '1,220p' apps/dashboard/src/pages/Tickets.tsx 2>/dev/null || echo "Tickets.tsx not found"
sed -n '1,220p' apps/dashboard/src/pages/MarketData.tsx 2>/dev/null || echo "MarketData.tsx not found"
sed -n '1,220p' apps/dashboard/src/pages/Analytics.tsx 2>/dev/null || echo "Analytics.tsx not found"

echo
echo "--- UI design docs ---"
ls -R docs/ui 2>/dev/null || echo "docs/ui missing"
ls -R docs/ui/specs 2>/dev/null || echo "docs/ui/specs missing"
sed -n '1,180p' docs/ui/PRISM_APEX_UI_DESIGN_SYSTEM.md 2>/dev/null || echo "design system doc missing"
sed -n '1,160p' docs/ui/specs/ui-pages.md 2>/dev/null || echo "ui-pages spec missing"
sed -n '1,160p' docs/ui/specs/worklist.md 2>/dev/null || echo "worklist spec missing"
sed -n '1,160p' docs/ui/specs/markets.md 2>/dev/null || echo "markets spec missing"
sed -n '1,160p' docs/ui/specs/tickets.md 2>/dev/null || echo "tickets spec missing"

echo
echo "=== DONE – Paste the key excerpts (Design System tokens + ExecutionShell + ui-pages spec) back into chat. ==="
