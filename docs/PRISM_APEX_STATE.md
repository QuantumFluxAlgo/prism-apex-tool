# Prism-Apex – STATE

- **Current Phase:** Phase 5 – Observability & Rollout Foundations
- **Last completed step:** 5.2 – RiskEngineV2 → observability wiring (batch decisions now emit summarised events)
- **Currently active step:** 5.3 – Ticket & operator observability
- **Latest green RUN gate (API):**
  - docker compose build api
  - pnpm lint
  - pnpm typecheck
  - pnpm vitest src/observability/events.test.ts \
                src/risk/risk-engine-v2.test.ts \
                src/strategy/osb/osb.test.ts \
                src/strategy/vwap-ft/vwap-ft.test.ts \
                src/strategy/orr/orr-v3.test.ts \
                src/strategy/orchestrator/orchestrator.test.ts

## Phase 5 – Current focus

- Wire `recordTicketCreatedEvent(...)` into the orchestrator’s ticket creation path (read-only).
- Prepare `recordOperatorActionEvent(...)` for future operator workflows.
- Explore a JSONL/file sink for observability events (still local/dev-only).
- No change to trading behaviour or infra yet.

---

## Phase 4 – Completion Note (2025-11-16)

- **Phase 4.3 – Risk UX polish** (RiskCell v2.2) complete.
- API/dashboard RUN gates green under the shared risk-aware UX.
- Hand-off to Phase 5 for observability + rollout prep.
