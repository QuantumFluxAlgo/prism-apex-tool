#!/usr/bin/env bash
set -euo pipefail

# PRISM APEX – V2 CODEX TERMINAL ORCHESTRATOR (BACKEND-FIRST, CONTROLLED)
#
# PURPOSE
#   - Tight, auditable control over what Codex Terminal is allowed to do.
#   - Materialise expert-reviewed plans, diffs, and cleanup scaffolding into the repo.
#   - Enforce:
#       * Backend-first work.
#       * Reuse before creating new code.
#       * Only INDEX/VIEW additions in SQL (Option 3).
#       * Safe, explicit deletion/suspicious tracking.
#
# IMPORTANT
#   - This script does NOT edit app source files or existing SQL migrations.
#   - It only creates/updates:
#       docs/
#       reports/
#       scripts/
#       deploy/sql/030_worklist_v2_indexes.sql (indexes/views only)
#   - Codex Terminal / engineers must apply diffs and implement changes explicitly.

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "=== PRISM APEX – V2 CODEX TERMINAL ORCHESTRATOR ==="
echo "Repo root: $ROOT"
echo

# -----------------------------
# Helpers
# -----------------------------

ensure_dir() {
  mkdir -p "$1"
}

create_if_missing() {
  local target="$1"
  local label="$2"
  if [[ -f "$target" ]]; then
    echo "[SKIP] $label already exists: $target"
    return 0
  fi
  echo "[WRITE] Creating $label: $target"
  cat > "$target"
}

append_if_missing_line() {
  local file="$1"
  local line="$2"
  ensure_dir "$(dirname "$file")"
  touch "$file"
  if ! grep -Fq "$line" "$file"; then
    echo "$line" >> "$file"
    echo "[APPEND] Added line to $file: $line"
  else
    echo "[SKIP] Line already present in $file"
  fi
}

# -----------------------------
# 0. Safety / sanity checks
# -----------------------------

echo "--- Sanity checks ---"

if [[ ! -d "apps/api" || ! -d "apps/dashboard" ]]; then
  echo "[WARN] apps/api or apps/dashboard not found. Are you in the prism-apex-tool repo?"
fi

if [[ ! -f "full_files_list.json" ]]; then
  echo "[WARN] full_files_list.json missing. Codex Terminal should regenerate repo outputs before deeper automation."
else
  echo "[OK] full_files_list.json present."
fi

if [[ ! -f "backend_dependency_graph.json" ]]; then
  echo "[WARN] backend_dependency_graph.json missing."
else
  echo "[OK] backend_dependency_graph.json present."
fi

if [[ ! -f "frontend_dependency_graph.json" ]]; then
  echo "[WARN] frontend_dependency_graph.json missing."
else
  echo "[OK] frontend_dependency_graph.json present."
fi

ensure_dir "reports"
ensure_dir "reports/v2"
ensure_dir "scripts"
ensure_dir "docs"
ensure_dir "deploy/sql"

echo

# -----------------------------
# 1. Codex Terminal Playbook
# -----------------------------

create_if_missing "docs/V2_CODEX_TERMINAL_PLAYBOOK.md" "Codex Terminal Playbook" <<'EOF'
# Prism Apex – V2 Codex Terminal Playbook

## Operating Constraints

1. **Backend-first**
   - Always patch backend routes / services / DTOs **before** wiring dashboards.
   - Prioritise:
     - `/api/worklist`
     - `/api/tickets`
     - `/api/system/*`
     - `/market/*`
     - `/analytics/*`

2. **Reuse before new code**
   - Before creating any new route, hook, or component:
     - Search for an existing equivalent.
     - If something can be reused/adapted, prefer that path.
   - Examples:
     - Reuse `computeEngineTicketScoreFromRow` for scoring.
     - Reuse canonical ticket builders from `dto/canonicalTicketView`.
     - Reuse `fetchSessionMetricsBatch` instead of new ad-hoc queries.

3. **SQL Changes (Option 3 only)**
   - ALLOWED:
     - New indexes.
     - New views / materialized views.
   - NOT ALLOWED:
     - Dropping columns/tables.
     - Altering column types.
     - Destructive migrations.
   - All SQL changes must go into a new file:
     - `deploy/sql/030_worklist_v2_indexes.sql` (or higher), tagged as "INDEXES/VIEWS ONLY".

4. **Deletion discipline**
   - No direct deletion of code/docs.
   - Instead:
     - Add candidates to `codebase-cleanup-suspicious.txt`.
     - Use `scripts/codebase-cleanup-safe.sh` for reproducible artefacts only.
   - Final deletion is a separate, deliberate step.

5. **Mocks vs real data**
   - Primary objective: move dashboards off mocks and onto real engine/API data.
   - For each page:
     - Prefer live routes.
     - Fallback to mocks only when API is unavailable AND error state is surfaced.

## Implementation Sequence

1. **Phase 1 – Confirm scan artefacts**
   - Ensure JSON scans exist:
     - `full_files_list.json`
     - `backend_dependency_graph.json`
     - `frontend_dependency_graph.json`
     - `ticket_flow_map.md`
     - `backend_contracts_summary.md`
     - `dashboard_alignment_report.md`
   - If missing, regenerate via repo scan script.

2. **Phase 2 – Backend (critical path)**
   - Implement `/api/worklist` as canonical feed using:
     - `tickets` table.
     - `SessionMetrics` batch helper.
     - `sessionFlagsService`.
     - `computeEngineTicketScoreFromRow`.
     - Canonical ticket builder.
   - Align `/api/system/*`, `/market/*`, `/analytics/*` with dashboard contracts.
   - Add allowed indexes/views per `deploy/sql/030_worklist_v2_indexes.sql`.

3. **Phase 3 – Frontend wiring**
   - Update hooks and pages to consume new/real backend outputs:
     - `useWorklistTickets` → `/api/worklist`.
     - `MarketData` → `/market/*` + session metrics.
     - `Analytics` → history from `/api/tickets`.
     - `Alerts` → `/api/system/alerts`.
     - `Status` → `/api/status`, `/api/system/jobs`, `/api/system/telemetry`.
     - `Positions` → canonical tickets.

4. **Phase 4 – Cleanup**
   - Keep removing/archiving:
     - Legacy pages/HTML mocks.
     - Orphaned docs.
   - Only via:
     - `scripts/codebase-cleanup-safe.sh` (for artefacts).
     - `codebase-cleanup-suspicious.txt` for human-approved removal.

5. **Phase 5 – Validation**
   - Confirm:
     - Tickets flow end-to-end from Yahoo 1m bars → engine → tickets → dashboards.
     - Worklist shows actionable, risk-aware tickets only.
     - System/alerts dashboards use live API data.
     - Docker local/remote deploys pass health checks.

EOF

echo

# -----------------------------
# 2. Backend contracts summary
# -----------------------------

create_if_missing "reports/v2/backend_contracts_summary.md" "Backend contracts summary" <<'EOF'
# Backend Contracts for Dashboard V2 (Grounded Summary)

This file describes the intended backend contracts driving the A3 dashboards. It should be kept in sync with the actual Fastify routes.

## /api/tickets

- File: `apps/api/src/routes/tickets.ts`
- Inputs: query params `symbol`, `strategy`, `status`, `direction`, `scope`, `from`, `to`, pagination and RR/risk filters.
- Outputs (row-level):
  - Canonical ticket fields (prices, direction, status, timestamps).
  - Risk fields: `contracts`, `riskDollars`, `rewardDollars`, `rrMultiple`.
  - Engine context: `canonicalApproved`, `pnl`, `pnlRMultiple`.
  - Session context: `sessionMetrics`, `sessionFlags`.
  - Risk: `riskDecision` (TicketRiskDecisionDto).
  - Scoring: `score`, `scoreTrend`.
- Gaps:
  - Standardised `pnlTicks`.
  - Age metrics (`ageMinutes`).
  - Flattened session summary strings.

## /api/worklist

- File: `apps/api/src/routes/worklist.ts`
- Current: mock WorklistTicketDto (static).
- Target:
  - Source: canonical `tickets` table.
  - Filter: `status = 'OPEN'`, `actionable = true`.
  - Enrichment:
    - `SessionMetrics` (batch).
    - Session flags (news/FOMC/roll).
    - Risk decision and derived risk bucket.
    - PnL ticks.
    - Score, trend, and score delta per symbol/strategy.
  - Response:
    - `{ total, tickets: WorklistTicketDto[] }`.

## /api/system/*

- `/api/system/alerts`:
  - Live system alerts buffer.
  - Alerts dashboard must consume this instead of static SEED_ALERTS.
- `/api/system/jobs` and `/api/system/telemetry`:
  - Job health and telemetry snapshots.
  - Status dashboard should consume these.

## /api/status

- File: `apps/api/src/routes/status.ts`
- Provides:
  - Service health.
  - Yahoo ingest health.
  - Job and system state summary.
- Target:
  - Map into core/external tiles on Status dashboard.

## /market/*

- `/market/symbols`, `/market/sessions`:
  - Symbol metadata and session schedules.
- Target:
  - MarketData should derive its table from these and SessionMetrics, instead of `/api/markets` mocks.

## /analytics*

- `/analytics/summary`:
  - High-level PnL and payout state.
- Target:
  - Analytics dashboard can bootstrap from `/api/tickets` history and/or an `/api/analytics` aggregator.

## Strategy Config / Risk / Operator

- `/api/strategy-config/:strategy`:
  - Strategy configuration and warnings.
- `/api/operator-risk`, `/api/operator-config`, `/api/operatorSizing`:
  - Operator risk posture and sizing previews.
- Target:
  - StrategyLab to combine strategy config, canonical tickets, and risk context.

EOF

echo

# -----------------------------
# 3. Worklist backend patch diff
# -----------------------------

create_if_missing "reports/v2/worklist_v2_backend_patches.diff" "Worklist backend diff" <<'EOF'
# Worklist V2 Backend Patches (Reference Diff)
# ... reference diff content ...
EOF

echo

# -----------------------------
# 4. Frontend Worklist + dashboard patch diffs
# -----------------------------

create_if_missing "reports/v2/worklist_v2_frontend_patches.diff" "Worklist frontend diff" <<'EOF'
# Worklist V2 Frontend Patches (Reference Diff)
# ...
EOF

echo

create_if_missing "reports/v2/dashboard_pages_patch_set.diff" "Dashboard pages patch set" <<'EOF'
# Dashboard Pages Patch Set (Reference Diff)
# ...
EOF

echo

# -----------------------------
# 5. Safe cleanup script and suspicious list
# -----------------------------

create_if_missing "scripts/codebase-cleanup-safe.sh" "Safe cleanup script" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# PRISM APEX SAFE CLEANUP
# Deletes reproducible artefacts (logs, mock backups) only.
# Tickets, configs, migrations, and source trees are untouched.

ROOT="${1:-$(git rev-parse --show-toplevel)}"
cd "$ROOT"

SAFE_GLOBS=(
  "pages/*.bak"
  "pages/*pre-v2*"
  "pages/*fix-*.bak"
  "pages/*backup*.tsx"
  "markets-mock/*"
  "tickets_dump.csv"
  "tmp/**"
  "logs/**"
  "*.log"
  "reports/removals/**"
)

echo "=== SAFE CLEANUP (artefacts only) ==="
for glob in "${SAFE_GLOBS[@]}"; do
  mapfile -t matches < <(git ls-files -z -o -i --exclude-standard -- "$glob" | tr '\0' '\n')
  if [[ "${#matches[@]}" -eq 0 ]]; then
    continue
  fi
  for path in "${matches[@]}"; do
    echo "[DEL] $path"
    rm -rf "$path"
  done

done

find pages -type d -empty -delete 2>/dev/null || true

echo "Cleanup complete. Verify 'git status' before committing."
EOF
chmod +x scripts/codebase-cleanup-safe.sh

create_if_missing "reports/codebase-cleanup-suspicious.txt" "Suspicious/deletion list" <<'EOF'
# Prism Apex – Codebase Cleanup Suspicious List
# ...
EOF

echo

# -----------------------------
# 6. Expert review pack
# -----------------------------

create_if_missing "docs/expert-review-pack.md" "Expert review pack" <<'EOF'
# Expert Review Pack – V2 Dashboard & Engine
# ...
EOF

echo

# -----------------------------
# 7. SQL migration stub (indexes/views only)
# -----------------------------

SQL_MIG="deploy/sql/030_worklist_v2_indexes.sql"
if [[ -f "$SQL_MIG" ]]; then
  echo "[SKIP] SQL migration already exists: $SQL_MIG"
else
  echo "[WRITE] Creating SQL migration stub (indexes/views only): $SQL_MIG"
  cat > "$SQL_MIG" <<'EOF'
-- 030_worklist_v2_indexes.sql
-- PRISM APEX – V2 Worklist / Tickets Indexes & Views
-- CONSTRAINT: This file must only contain:
--   - CREATE INDEX (or CREATE INDEX CONCURRENTLY where supported)
--   - CREATE VIEW / CREATE MATERIALIZED VIEW
-- No table/column modifications or destructive operations.

-- Example (validate against actual schema before enabling):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_symbol_strategy_direction_opened_at
--   ON tickets(symbol, strategy, direction, opened_at_utc DESC);

-- Optional: a view that surfaces latest actionable ticket per symbol/strategy.
-- CREATE VIEW worklist_v2_latest_actionable AS
-- SELECT DISTINCT ON (symbol, strategy, direction)
--   *
-- FROM tickets
-- WHERE actionable IS TRUE AND status = 'OPEN'
-- ORDER BY symbol, strategy, direction, opened_at_utc DESC, id DESC;

EOF
fi

echo

# -----------------------------
# 8. Summary / Next Actions
# -----------------------------

echo "=== SUMMARY ==="
echo "Playbook:       docs/V2_CODEX_TERMINAL_PLAYBOOK.md"
echo "Backend summary: reports/v2/backend_contracts_summary.md"
echo "Worklist backend diff:   reports/v2/worklist_v2_backend_patches.diff"
echo "Worklist frontend diff:  reports/v2/worklist_v2_frontend_patches.diff"
echo "Dashboards patch set:    reports/v2/dashboard_pages_patch_set.diff"
echo "Cleanup script:          scripts/codebase-cleanup-safe.sh"
echo "Suspicious list:         reports/codebase-cleanup-suspicious.txt"
echo "Expert review pack:      docs/expert-review-pack.md"
echo "SQL indexes stub:        deploy/sql/030_worklist_v2_indexes.sql"
echo
echo "NEXT (for Codex Terminal / engineers):"
echo "  1) Implement backend changes first using:"
echo "       - worklist_v2_backend_patches.diff"
echo "       - backend_contracts_summary.md"
echo "       - expert-review-pack.md"
echo "  2) Only then wire dashboards using:"
echo "       - worklist_v2_frontend_patches.diff"
echo "       - dashboard_pages_patch_set.diff"
echo "  3) Keep updating reports/codebase-cleanup-suspicious.txt instead of deleting live code."
echo "  4) Use scripts/codebase-cleanup-safe.sh only for artefacts/logs."
echo
echo "Done."
