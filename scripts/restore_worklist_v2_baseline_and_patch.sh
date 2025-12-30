#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – Restore WorklistV2.tsx baseline and patch session metrics call ==="

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

TARGET="apps/dashboard/src/pages/WorklistV2.tsx"

echo
echo "--- Restoring ${TARGET} from HEAD ---"
git show "HEAD:${TARGET}" > "${TARGET}"

echo
echo "--- Patching fetchSessionMetrics call to use object arg ---"
node - <<'NODE'
const fs = require('fs');
const path = require('path');

const target = path.join(process.cwd(), 'apps/dashboard/src/pages/WorklistV2.tsx');
let src = fs.readFileSync(target, 'utf8');

const before = '        const metrics = await fetchSessionMetrics(query.symbol, query.sessionDate);';
const after = [
  '        const metrics = await fetchSessionMetrics({',
  '          symbol: query.symbol,',
  '          sessionDate: query.sessionDate,',
  '        });',
].join('\n');

if (!src.includes(before)) {
  console.error('Expected fetchSessionMetrics call not found in WorklistV2.tsx; aborting.');
  process.exit(1);
}

src = src.replace(before, after);
fs.writeFileSync(target, src, 'utf8');
NODE

echo
echo "--- Running dashboard tests ---"
pnpm --filter prism-apex-dashboard test
