# Prism Apex Delivery Plan

This document describes the high-level phases and major steps for delivering the multi-strategy Prism Apex trading engine:

- Architecture & data foundations
- Strategy engine (ORR, VWAP FT, OSB)
- Multi-strategy risk & orchestration
- UI/UX (Worklist, Status, Market Data, Tickets, Reports)
- Testing, Golden Days, observability, and rollout.

The current progress is tracked in a separate file:

- `docs/PRISM_APEX_STATE.md` — the single source of truth for:
  - Current phase
  - Current step
  - Next Codex task
  - Last OUTCOME REPORT date

## Phase 1 – Data & Metrics Foundations

- **1.1 – SessionMetrics schema & migrations**  
  **Status:** DONE. Baseline schema + migrations for SessionMetrics wired into the database model.

- **1.2 – Bar ingestion → SessionMetrics population**  
  **Status:** DONE. 1-minute bar ingestion feeds the SessionMetrics job; core metrics (OR width, ATR, OR:ATR ratio, VWAP context/regime) are computed for (symbol, sessionDate).

- **1.3 – Config-driven news/session flags**  
  **Status:** DONE.  
  - Introduced a config model and in-memory `SessionFlagsService` (SessionFlag enum, `SESSION_FLAGS_CONFIG`, simple symbolPattern + sessionDate matching).  
  - Added unit tests for the service to verify aggregation and `hasNewsFlag` behaviour.  
  - Tickets API now enriches each ticket DTO with a `sessionFlags` summary `{ flags: SessionFlag[]; hasNewsFlag: boolean }` sourced purely from config (no extra DB calls).  
  - Dashboard DTO typings updated and the Tickets view renders a small “News” chip in the Session column whenever `sessionFlags.hasNewsFlag` is true.

- **1.4 – Golden Day fixtures & replay harness**  
  **Status:** DONE.  
  - Golden Day fixtures stored per (symbol, sessionDate) with 1-minute bars + optional expected metrics.

- **1.5 – Data model documentation**  
  **Status:** DONE.  
  - Authored `docs/PRISM_APEX_DATA_MODEL_PHASE1.md` to capture SessionMetrics flows, Golden Day fixtures, and session flags.

- **1.8 – SessionMetrics integration bundle (API, Tickets, UI, tooling)**  
  **Status:** DONE (core integration path + Worklist Session parity).  
  - 1.8b – Tickets API augmentation with SessionMetrics summaries: **DONE**.  
  - 1.8c – Tickets/Worklist UI rendering of SessionMetrics: **DONE** (core chip layout).  
  - 1.8d – Node 20 tooling/tests standardization: **DONE** (SessionMetrics job, Golden Day harness, SessionFlags service).

## Phase 2 – Strategy Engine Foundations

**Goal:** Introduce pure strategy engines (ORR v3, VWAP First Touch, OSB) and a multi-strategy orchestrator, fully tested and read-only (no order placement).

- **2.1 – Strategy Orchestrator contract & design** — ✅ DONE
- **2.2 – Orchestrator skeleton & initial tests** — ✅ DONE
- **2.3 – ORR v3 design & skeleton** — ✅ DONE
- **2.3b – ORR v3 behaviour & tests** — ✅ DONE
- **2.4 – VWAP First Touch strategy** — ✅ DONE
- **2.5 – OSB strategy module** — ✅ DONE
- **2.6 – Multi-strategy integration & conflict resolution** — ✅ DONE

Phase 2 status: ✅ Complete – strategy engines and orchestrator are pure, deterministic, and fully covered by tests.

## Phase 3 – Risk & Guardrails Foundations

**Goal:** Add a pure, deterministic risk layer on top of the multi-strategy engine so ticket drafts can be evaluated safely before they ever reach an operator or an exchange. All outputs remain read-only; no live orders.

- **3.1 — Risk Engine v2 design + skeleton — ✅ DONE**
  - Deliverables:
    - Design doc: `docs/PRISM_APEX_RISK_ENGINE_V2_DESIGN.md` describing a pure, read-only RiskEngineV2 that evaluates ticket drafts using account + strategy guardrails and session flags.
    - New module: `apps/api/src/risk/risk-engine-v2.ts` exporting `createRiskEngineV2(deps?)` with:
      - Explicit types for `RiskEngineContext`, `TicketDraft`, `RiskDecision`, and `RiskReasonCode`.
      - DI hooks for future account/exposure providers (accepted but unused in v2).
    - Tests: `apps/api/src/risk/risk-engine-v2.test.ts` covering:
      - Happy-path OK decision.
      - Trading-disabled hard block.
      - News hard block when `blockOnNews=true`.
      - Batch evaluation and summary aggregation.
  - Tooling:
    - Initial RUN gates validated the module in isolation.

- **3.2 — Per-strategy caps & warnings — ✅ DONE**
  - Behaviour:
    - Risk engine enforces:
      - Per-ticket caps (`maxContractsPerTicket`): oversized tickets are clamped and flagged as `STRATEGY_TICKET_SIZE_CAP` with warnings.
      - Per-session caps (`maxContractsPerSession`): if projected exposure would exceed the session cap, ticket is blocked with `STRATEGY_SESSION_CONTRACT_CAP`.
    - Existing global guardrails (`TRADING_DISABLED`, `NEWS_HARD_BLOCK`) remain intact.
  - Tests:
    - Extended risk-engine v2 test suite to cover clamping, hard blocks, and mixed batches where some drafts are allowed and some blocked.

- **3.3 — Account-level loss / drawdown checks — ✅ DONE**
  - Behaviour:
    - Engine now computes a simple projected loss per draft:
      - `potentialLoss = |entryPrice - stopPrice| * contracts`.
      - Combines this with `sessionStateSnapshot.maxDrawdownToday`.
    - If projected drawdown breaches `maxDailyLoss` or `maxTrailingDrawdown`, ticket is hard-blocked with `DAILY_DD_HARD_LIMIT`.
    - Per-strategy caps and ticket-size behaviour remain unchanged on top of these checks.
  - Tests:
    - Added cases for:
      - Daily-loss breach.
      - Trailing-DD breach.
      - Just-below-limit (allowed) scenarios.
      - Mixed batches combining DD blocks, cap blocks, and allowed drafts.

- **3.4 — Risk surfacing + orchestrator wiring — ✅ DONE (current RUN gate)**  
  - Behaviour:
    - API DTOs:
      - New shared risk DTO: `apps/api/src/routes/dto/riskDecisionDto.ts` defines a compact HTTP-safe shape for risk decisions.
      - `TicketRowDto` in `apps/api/src/routes/tickets.ts` now includes `riskDecision?: TicketRiskDecisionDto | null`, alongside `sessionMetrics` and `sessionFlags`.
      - `/tickets.debug` mirrors this shape so debug tools and UI clients see the same contract.
    - Dashboard:
      - `apps/dashboard/src/lib/api.ts` now defines `TicketRiskDecision` and adds `riskDecision?: TicketRiskDecision | null` to `TicketRow`, so the UI can consume risk info without schema drift.
    - Orchestrator wiring:
      - `apps/api/src/strategy/orchestrator/orchestrator.ts` imports the risk engine types and exposes a pure helper: `evaluateRiskForDrafts(drafts, ctx)` which:
        - Instantiates `createRiskEngineV2()`.
        - Runs `evaluateBatch` against strategy drafts and context.
        - Returns a structured list of `{ draft, decision }` suitable for downstream attachment to DTOs.
      - Orchestrator core trade-selection behaviour remains pure and deterministic; risk evaluation is layered on without adding side effects.
  - Tooling (latest RUN gate — 2025-11-16):
    - `docker compose build api`
    - Inside api container:
      - `pnpm lint` (warnings only; no errors).
      - `pnpm typecheck` (green).
      - `pnpm vitest` for:
        - `src/risk/risk-engine-v2.test.ts`
        - `src/strategy/osb/osb.test.ts`
        - `src/strategy/vwap-ft/vwap-ft.test.ts`
        - `src/strategy/orr/orr-v3.test.ts`
        - `src/strategy/orchestrator/orchestrator.test.ts`
      - All 5 files / 27 tests passed.

- **3.5 — Risk visibility in Tickets / Worklist — 🔄 CURRENT STEP**
  - Planned deliverables:
    - Wire **real** risk decisions into the Tickets API path:
      - Strategy Orchestrator emits ticket drafts per symbol/session.
      - RiskEngineV2 evaluates those drafts with live `RiskEngineContext`.
      - `/tickets` and `/tickets.debug` attach `riskDecision` per ticket from the risk evaluation output.
    - Dashboard/UI:
      - Tickets and Worklist views render a small, unobtrusive risk indicator using `riskDecision`:
        - Example: badge or icon for `NEWS_HARD_BLOCK`, `DAILY_DD_HARD_LIMIT`, or clamped ticket size.
        - Keep it read-only — no order placement or auto-blocking UI yet.
    - Docs:
      - Extend Data Model / Risk docs to describe how risk decisions flow from orchestrator → RiskEngineV2 → API DTO → dashboard.
  - Tooling expectations:
    - Maintain green gates:
      - `pnpm lint`, `pnpm typecheck`.
      - Vitest coverage for risk-informed orchestrator behaviour and DTO mapping.


## Phase 4 – Worklist/Tickets UX & Market Data

### Step 4.1 – Worklist/Tickets risk-aware UX v2 (✅ DONE)

- Tickets and Worklist share a single `TicketRow` shape that includes session metrics,
  session flags, riskDecision, operator sizing, and PnL view fields.
- The initial RiskCell showed a simple OK/Warn/Blocked pill sourced from the real
  RiskEngineV2 evaluations coming through the API.
- Dashboard-specific lint/typecheck gate (`pnpm lint`, `pnpm typecheck` inside `apps/dashboard`)
  runs clean with only the expected `_err` / `navigator` warnings.

### Step 4.2 – Market Data chart typing & RUN gate (✅ DONE)

- `apps/dashboard/src/pages/MarketData.tsx` now compiles under the standard dashboard
  `tsconfig`:
  - Lightweight Charts usage is fenced behind explicit `any` casts and well-placed
    `// @ts-ignore` shims instead of a file-wide `@ts-nocheck`.
  - Runtime behaviour, chart options, and operator workflow stayed unchanged.
- Dashboard lint/typecheck gate remains green after the change.

### Step 4.3 – UX polish & chart typing debt paydown (🔄 CURRENT)

- **RiskCell v2** (shipped):
  - Upgraded to four explicit states: **Not evaluated, OK, Warn, Blocked**.
  - Normalises placeholder decisions, detects hard-block codes (`TRADING_DISABLED`,
    `NEWS_HARD_BLOCK`, per-session caps, etc.), and provides a compact detail line.
  - Keeps Tickets/Worklist layouts stable while giving operators clearer context.
  - Dashboard gate (`pnpm lint`, `pnpm typecheck`) still green after the change.
- **MarketData typing debt (ongoing):**
  - Gradually replace the remaining `any` / `@ts-ignore` chart shims with properly typed
    helpers while keeping the RUN gate green.
- **Future UX polish:**
  - Potential hover tooltips / filters for RiskCell.
  - Additional operator-focused refinement on Worklist/Tickets based on feedback.

---

## Phase 4 – UX, Sizing & Risk Surfacing (status as of 2025-11-16)

**What Phase 4 achieved**

- Unified **risk-aware UX** for Tickets and Worklist:
  - Shared **RiskCell** component with four clear states:
    - **Not evaluated** – risk engine has not run yet.
    - **OK** – within all current guardrails.
    - **Warn** – allowed, but close to one or more caps.
    - **Blocked** – hard risk block (e.g. news, DD, caps).
  - Tickets and Worklist both read from the same `riskDecision` DTO and
    render a consistent pill and detail line.
- Shared **sizing / risk metadata**:
  - Centralised `computePositionFromStake` helper so all strategies size
    trades the same way from a dollar stake + ticks-to-stop.
  - `TicketDraft` carries risk metadata (risk dollars, ticks to stop, R
    multiple) into **RiskEngineV2**.
  - Per-trade dollar caps enforced in one place via `maxRiskDollarsPerTrade`.
- Tooling:
  - API: docker compose build api + pnpm lint + pnpm typecheck +
    risk/strategy/orchestrator Vitest suites all green.
  - Dashboard: pnpm lint + pnpm typecheck green with Risk-aware UX enabled.

**Operator view**

- For every ticket the operator now sees:
  - a fixed stake-based size,
  - a risk decision (OK / Warn / Blocked / Not evaluated),
  - and a short reason/tooltipped codes when there is a warning or block.
- No need to inspect logs to understand “why this ticket is blocked”;
  the UI explains it directly.

**Phase 4 status**

- Step 4.1 – Risk-aware Tickets/Worklist UX → ✅ DONE.
- Step 4.2 – MarketData page brought under a green lint/typecheck gate
  (with explicit shims where typings are still being paid down) → ✅ DONE.
- Step 4.3 – RiskCell polish (v2.x), tooltips, and dashboard gate → ✅ DONE.

---

## Phase 5 – Observability & Rollout Foundations (high-level)

**Objective**

- Make it obvious when the system is **healthy**, which parts are **degraded**,
  and when it is **safe to trade**, before you rely on it in live use.

**Scope (initial Step 5.1, to be refined)**

- Strengthen **observability** around:
  - Yahoo/ingress (data freshness, error rates, news/ROLL/FOMC flags).
  - SessionMetrics and SessionFlags pipelines.
  - Strategy engines (ORR v3, VWAP FT, OSB) and the orchestrator.
  - RiskEngineV2 (decision counts, block reasons, cap hits).
- Provide clear operator-facing views:
  - Status/health tiles (green/amber/red) in the dashboard.
  - Simple logs/metrics that explain “what is stuck” vs “what is fine”.
- Keep all changes read-only in Phase 5.1 (no auto-kill/auto-restart) so
  operators retain control while getting better visibility.

## Phase 5 – Status Update (2025-11-17)

- **Step 5.1 – Observability design & scaffolding** — ✅ DONE  
  - Event model captured in `docs/PRISM_APEX_OBSERVABILITY_DESIGN.md`.  
  - Console-based `recordEvent` helper + tests in `apps/api/src/observability`.  
- **Step 5.2 – RiskEngineV2 → observability wiring** — ✅ DONE  
  - `RiskEngineV2.evaluateBatch` now emits a summarised `recordRiskDecisionEvent(...)` per batch (session key, draft count, blocked/allowed/warnings counts, hard block reasons).  
  - API RUN gate (docker compose build api → pnpm lint/typecheck/vitest for obs + risk + ORR/VWAP/OSB/orchestrator) is green.  
- **Step 5.3 – Ticket & operator observability** — 🔄 CURRENT  
  - Emit `recordTicketCreatedEvent(...)` when the orchestrator creates a ticket.  
  - Emit `recordOperatorActionEvent(...)` when operators action/ignore tickets (future wiring).  
  - Optional: add JSONL/file sink for local observability without infra changes.  

