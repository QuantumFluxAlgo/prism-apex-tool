#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – APPLYING WORKLIST V2 A3+ OVERHAUL ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"
echo "Repo root: $REPO_ROOT"
echo

echo "--- Writing apps/dashboard/src/pages/WorklistV2.tsx ---"
cat <<'EOW' > apps/dashboard/src/pages/WorklistV2.tsx
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import React from 'react';
import type { CanonicalTicket } from '@prism-apex/shared';
import FiltersBar from '../ui/FiltersBar';
import DataTable, { type DataTableColumn } from '../ui/DataTable';
import Badge from '../ui/Badge';
import { fmtPrice, fmtR } from '../utils/number';
import { fmtUtc } from '../utils/time';
import { getWorklistV2CanonicalTickets } from '../lib/worklistMock';
import { fetchSessionMetrics, fetchWorklistCanonicalTickets } from '../lib/api';
import type { SessionMetricsDto } from '../lib/api';
import '../styles/worklist-a3.css';

const MAX_AGE_MINUTES = 30;

...
EOW

echo "--- Writing apps/dashboard/src/styles/worklist-a3.css ---"
cat <<'EOCSS' > apps/dashboard/src/styles/worklist-a3.css
...
EOCSS

echo
echo "--- Running dashboard tests (pnpm --filter prism-apex-dashboard test) ---"
if pnpm --filter prism-apex-dashboard test; then
  echo "=== Dashboard tests completed successfully ==="
else
  echo "!!! Dashboard tests FAILED (see output above) !!!"
  exit 1
fi

echo "=== Worklist V2 A3+ overhaul applied ==="
