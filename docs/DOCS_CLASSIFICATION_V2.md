# Prism Apex – Documentation Classification (V2 Snapshot)

This file classifies all top-level and `docs/` markdown files in the `prism-apex-tool` repo as of the current V2 snapshot.

Status meanings:

- `CANONICAL` – Primary source of truth; must be accurate and kept up to date. New behaviour and architecture must be reflected here.
- `SUPPORTING` – Helpful context or runbooks. Must not contradict canonical docs. Can be updated opportunistically.
- `LEGACY` – Old or superseded content. Must **not** be treated as truth. Candidate for `docs/archive/` or deletion after review.

When EPICs, flows, or architecture change, **canonical** docs and this classification must be updated in the same PR.

---

## 1. Top-Level Docs (Repo Root)

| Path | Status | Recommended Action |
|------|--------|--------------------|
| `AGENTS.md` | `SUPPORTING` | Keep; describes agents/personas; update if working style changes. |
| `CHANGELOG.md` | `SUPPORTING` | Keep; release history. |
| `CONTRIBUTING.md` | `SUPPORTING` | Keep; main contributing guide. |
| `GLOSSARY.md` | `SUPPORTING` | Keep; shared terminology; update when introducing new concepts. |
| `INTEGRATIONS-TRADOVATE.md` | `SUPPORTING` | Keep; Tradovate integration notes; ensure it matches actual integration code/flows. |
| `OPERATIONS.md` | `CANONICAL` | Keep and maintain; primary operator runbook. |
| `PORTS.md` | `SUPPORTING` | Keep; port registry; update when services or ports change. |
| `README.md` | `CANONICAL` | Keep and maintain; top-level project overview. |
| `TECH-SPEC.md` | `CANONICAL` | Keep and maintain; canonical tech spec; supersedes `docs/TECH-SPEC.md`. |
| `TESTING.md` | `SUPPORTING` | Keep; describes testing strategy. |

---

## 2. `docs/` Tree

| Path | Status | Recommended Action |
|------|--------|--------------------|
| `docs/CONTRIBUTING.md` | `LEGACY` | Duplicate/extended contributing info; prefer root `CONTRIBUTING.md`. Move to `docs/archive/` or delete after confirming no unique content is needed. |
| `docs/LOCAL_DEV.md` | `SUPPORTING` | Keep; local dev setup; tighten and verify against current dev scripts and Docker flows. |
| `docs/OPERATING-PREFERENCES.md` | `SUPPORTING` | Keep; internal operating preferences; update when working style changes. |
| `docs/PRISM_APEX_DATA_MODEL_PHASE1.md` | `CANONICAL` | Keep and maintain; describes core data model; update as the model evolves. |
| `docs/PRISM_APEX_DELIVERY_PLAN.md` | `SUPPORTING` | Keep; current delivery plan; align with actual progress and EPIC statuses. |
| `docs/PRISM_APEX_DELIVERY_PLAN.md.prev` | `LEGACY` | Old delivery plan; move to `docs/archive/` or delete. |
| `docs/PRISM_APEX_OPERATOR_SOP.md` | `CANONICAL` | Keep and maintain; operator SOP. |
| `docs/PRISM_APEX_ORR_V3_DESIGN.md` | `CANONICAL` | Keep and maintain; ORR V3 design. |
| `docs/PRISM_APEX_OSB_DESIGN.md` | `CANONICAL` | Keep and maintain; OSB design. |
| `docs/PRISM_APEX_RISK_ENGINE_V2_DESIGN.md` | `CANONICAL` | Keep and maintain; Risk Engine V2 spec. |
| `docs/PRISM_APEX_STATE.md` | `CANONICAL` | Keep and maintain; current state model. |
| `docs/PRISM_APEX_STATE.md.prev` | `LEGACY` | Old state doc; move to `docs/archive/` or delete. |
| `docs/PRISM_APEX_V2_BUILD_AUDIT.md` | `CANONICAL` | Keep and maintain; V2 build audit/waivers. |
| `docs/PRISM_APEX_V2_DASHBOARD_PLAN.md` | `CANONICAL` | Keep and maintain; primary V2 dashboard plan and epic/story contract. |
| `docs/PRISM_APEX_VWAP_FT_DESIGN.md` | `CANONICAL` | Keep and maintain; VWAP First-Touch design. |
| `docs/TECH-SPEC.md` | `LEGACY` | Explicitly marked archived; keep only as legacy reference or move fully to `docs/archive/`. Root `TECH-SPEC.md` is canonical. |
| `docs/data/SESSION_METRICS.md` | `SUPPORTING` | Keep; describes session metrics concepts. Align with `apps/api/src/jobs/session-metrics/*` and related DTOs. |
| `docs/data/SESSION_METRICS_POPULATION.md` | `SUPPORTING` | Keep; describes metrics population pipeline; align with actual jobs and routes. |
| `docs/data/session-metrics-data-model.md` | `SUPPORTING` | Keep; describes session metrics data model; ensure it matches current types and schemas. |
| `docs/ingest/README.md` | `SUPPORTING` | Keep; ingest pipeline notes; align with `apps/ingest` and `apps/api/src/jobs/feed.ts`. |
| `docs/runbooks/data-recovery-gapfill.md` | `SUPPORTING` | Keep; runbook for data recovery/gapfill; align with ingest and gapfill jobs. |
| `docs/specs/epics/epic-0-5.md` | `CANONICAL` | Keep and maintain; EPIC 0.5 spec. |
| `docs/specs/epics/epic-0.md` | `CANONICAL` | Keep and maintain; EPIC 0 spec. |
| `docs/specs/epics/epic-1.md` | `CANONICAL` | Keep and maintain; EPIC 1 spec. |
| `docs/specs/epics/epic-10.md` | `CANONICAL` | Keep and maintain; EPIC 10 spec. |
| `docs/specs/epics/epic-2.md` | `CANONICAL` | Keep and maintain; EPIC 2 spec. |
| `docs/specs/epics/epic-3.md` | `CANONICAL` | Keep and maintain; EPIC 3 spec. |
| `docs/specs/epics/epic-4.md` | `CANONICAL` | Keep and maintain; EPIC 4 spec. |
| `docs/specs/epics/epic-5.md` | `CANONICAL` | Keep and maintain; EPIC 5 spec. |
| `docs/specs/epics/epic-6.md` | `CANONICAL` | Keep and maintain; EPIC 6 spec. |
| `docs/specs/epics/epic-7.md` | `CANONICAL` | Keep and maintain; EPIC 7 spec. |
| `docs/specs/epics/epic-8.md` | `CANONICAL` | Keep and maintain; EPIC 8 spec. |
| `docs/specs/epics/epic-9.md` | `CANONICAL` | Keep and maintain; EPIC 9 spec. |
| `docs/specs/epics/epics.md` | `SUPPORTING` | Keep; overview of epics; should summarise and link to individual epic docs. |
| `docs/specs/epics/index.md` | `SUPPORTING` | Keep; index into epic specs. |
| `docs/ui/PRISM_APEX_UI_DESIGN_SYSTEM.md` | `CANONICAL` | Keep and maintain; A2 UI design system. |
| `docs/ui/README.md` | `SUPPORTING` | Keep; overview of UI docs. |
| `docs/ui/specs/analytics.md` | `CANONICAL` | Keep and maintain; Analytics UI spec. |
| `docs/ui/specs/markets.md` | `CANONICAL` | Keep and maintain; Markets UI spec. |
| `docs/ui/specs/strategy-lab.md` | `CANONICAL` | Keep and maintain; Strategy Lab UI spec. |
| `docs/ui/specs/system.md` | `CANONICAL` | Keep and maintain; System/Status UI spec. |
| `docs/ui/specs/tickets.md` | `CANONICAL` | Keep and maintain; Tickets UI spec. |
| `docs/ui/specs/ui-components.md` | `SUPPORTING` | Keep; shared UI components spec. |
| `docs/ui/specs/ui-pages.md` | `SUPPORTING` | Keep; UI pages overview. |
| `docs/ui/specs/worklist.md` | `CANONICAL` | Keep and maintain; Worklist UI spec. |

---

## 3. Next Actions

**Immediate recommendations:**

- For all `LEGACY` docs:
  - Move into `docs/archive/` or delete them once you’ve confirmed no unique, still-useful information exists.
  - Add a big header to archived copies: “LEGACY – DO NOT TREAT AS CURRENT TRUTH”.

- For all `CANONICAL` docs:
  - As you deliver each V2 epic (Worklist, Tickets, Markets, Analytics, Strategy Lab, System, EPIC 0–3 engine work), align the relevant canonical docs with:
    - The actual code in `apps/*` and `packages/*`.
    - `docs/PRISM_APEX_V2_DASHBOARD_PLAN.md`.
    - `docs/REPO_INDEX_V2.md`.

- For `SUPPORTING` docs:
  - Keep them as thin helpers. If they start duplicating canonical docs, either:
    - Replace with links into canonical docs, or
    - Merge content back into the canonical doc and trim the supporting one.

**Process rule going forward:**

Any time you make a change to:

- Engine behaviour
- Risk rules
- Session metrics
- Strategy config/model
- V2 pages (Worklist, Tickets, Markets, Analytics, Strategy Lab, System)

You must:

1. Update the relevant EPIC doc and/or UI spec under `docs/specs` / `docs/ui/specs`.
2. Update `docs/PRISM_APEX_V2_DASHBOARD_PLAN.md` if the change is user-visible.
3. Update `docs/REPO_INDEX_V2.md` if any files/routes/jobs/stores moved or were added.
4. Keep this classification in sync if documents are added, renamed, or archived.

