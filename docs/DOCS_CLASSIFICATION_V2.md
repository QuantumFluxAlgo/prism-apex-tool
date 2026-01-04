# PRISM APEX – V2 Documentation Classification

_Source of truth for what each doc is, how “live” it is, and whether it’s safe to delete._

- **Canonical V2**: part of the current, supported V2 system; do **not** delete.
- **Supporting**: useful context / runbooks / meta; keep unless you have a strong reason.
- **Historical / pre-V2**: older but still useful background; ok to archive, not usually deleted.
- **Obsolete snapshot**: superseded versions; safe to delete once you’re happy with the current docs.

| Doc path (under `docs/`) | Category | Status | Delete guidance |
| --- | --- | --- | --- |
| `CHANGES.md` | Misc | Supporting | Keep |
| `DOCS_CLASSIFICATION_V2.md` | Misc | Canonical V2 | Keep |
| `PRISM_APEX_CONTRIBUTING.md` | Meta / contribution | Supporting | Keep |
| `PRISM_APEX_DATA_MODEL_PHASE1.md` | Data model & metrics | Pre-V2 / historical | Archive or keep (do not hard-delete yet) |
| `PRISM_APEX_DATA_MODEL.md` | Data model & metrics | Supporting | Keep |
| `PRISM_APEX_DELIVERY_PLAN.md` | Product / delivery | Superseded by V2 master plan (keep for history) | Archive or keep (do not hard-delete yet) |
| `PRISM_APEX_DELIVERY_PLAN.md.prev` | Archive / Snapshot | Obsolete snapshot | Safe to delete |
| `PRISM_APEX_LOCAL_DEV.md` | Meta / contribution | Supporting | Keep |
| `PRISM_APEX_OPERATING_PREFERENCES.md` | Meta / contribution | Supporting | Keep |
| `PRISM_APEX_OPERATOR_SOP.md` | Runbooks / SOPs | Supporting | Keep |
| `PRISM_APEX_ORR_V3_DESIGN.md` | Strategies & signals | Canonical V2 | Keep |
| `PRISM_APEX_OSB_DESIGN.md` | Strategies & signals | Canonical V2 | Keep |
| `PRISM_APEX_PNL_MODEL.md` | PnL model | Canonical V2 | Keep |
| `PRISM_APEX_RISK_ENGINE_V2_DESIGN.md` | Risk engine | Canonical V2 | Keep |
| `PRISM_APEX_STATE.md` | Product / delivery | High-level state (still useful context) | Archive or keep (do not hard-delete yet) |
| `PRISM_APEX_STATE.md.prev` | Archive / Snapshot | Obsolete snapshot | Safe to delete |
| `PRISM_APEX_TECH-SPEC.md` | Architecture / wiring | Supporting | Keep |
| `PRISM_APEX_UI_DESIGN_SYSTEM.md` | UI / Dashboards | Canonical V2 | Keep |
| `PRISM_APEX_V2_ENGINE_WIRING_BACKLOG.md` | Architecture / wiring | Canonical V2 | Keep |
| `PRISM_APEX_V2_MASTER_PLAN.md` | Product / delivery | Canonical V2 | Keep |
| `UPGRADE_DASHBOARD.md` | UI / Dashboards | Canonical V2 | Keep (per-epic delivery log) |
| `REPO_INDEX_V2.md` | Misc | Canonical V2 | Keep |
| `data/README.md` | Data model & metrics | Supporting | Keep |
| `data/PRISM_APEX_DATA_MODEL.md` | Data model & metrics | Supporting | Keep |
| `data/PRISM_APEX_DATA_MODEL_PHASE1.md` | Data model & metrics | Pre-V2 / historical | Archive or keep (do not hard-delete yet) |
| `ingest/PRISM_APEX_INGEST_OVERVIEW.md` | Ingest & external feeds | Supporting | Keep |
| `ingest/PRISM_APEX_YAHOO_INGEST.md` | Ingest & external feeds | Supporting | Keep |
| `runbooks/PRISM_APEX_OPERATOR_RUNBOOK.md` | Runbooks / SOPs | Supporting | Keep |
| `runbooks/PRISM_APEX_RUNBOOK_DEPLOY.md` | Runbooks / SOPs | Supporting | Keep |
| `runbooks/PRISM_APEX_RUNBOOK_INCIDENTS.md` | Runbooks / SOPs | Supporting | Keep |
| `specs/PRISM_APEX_API_SURFACES.md` | Specs / design | Supporting | Keep |
| `specs/PRISM_APEX_BACKTESTING_SPEC.md` | Specs / design | Supporting | Keep |
| `specs/PRISM_APEX_ENGINE_HEALTH_SPEC.md` | Specs / design | Supporting | Keep |
| `specs/PRISM_APEX_EPICS_OVERVIEW.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `specs/PRISM_APEX_OBS_SPEC.md` | Specs / design | Supporting | Keep |
| `specs/PRISM_APEX_SYSTEM_DIAGRAM.md` | Specs / design | Supporting | Keep |
| `specs/epics/EPIC_00_FOUNDATION.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `specs/epics/EPIC_01_INGEST.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `specs/epics/EPIC_02_ENGINE_CORE.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `specs/epics/EPIC_03_STRATEGIES.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `specs/epics/EPIC_04_RISK.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `specs/epics/EPIC_05_DASHBOARDS_V1.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `specs/epics/EPIC_06_AUTOMATION.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `specs/epics/EPIC_07_ALERTING.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `specs/epics/EPIC_08_OPERATOR_EXCELLENCE.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `specs/epics/EPIC_09_PNL_REPORTING.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `specs/epics/EPIC_10_HARDENING.md` | Product epics & phases | Historical backbone (Phase 0–10) | Archive or keep (do not hard-delete yet) |
| `ui/PRISM_APEX_UI_DESIGN_SYSTEM.md` | UI / Dashboards | Canonical V2 | Keep |
| `ui/specs/PRISM_APEX_UI_ANALYTICS_V2.md` | UI / Dashboards | Canonical V2 | Keep |
| `ui/specs/PRISM_APEX_UI_MARKETS_V2.md` | UI / Dashboards | Canonical V2 | Keep |
| `ui/specs/PRISM_APEX_UI_STRATEGY_LAB_V2.md` | UI / Dashboards | Canonical V2 | Keep |
| `ui/specs/PRISM_APEX_UI_SYSTEM_V2.md` | UI / Dashboards | Canonical V2 | Keep |
| `ui/specs/PRISM_APEX_UI_WORKLIST_V2.md` | UI / Dashboards | Canonical V2 | Keep |

### Epic delivery logs

- `docs/UPGRADE_DASHBOARD.md` now carries the canonical record for Epic 1 (A3 Dashboard Contract Hardening). Supporting scan output lives under `reports/upgrade_dashboard/epic1_contract_alignment/OUTCOME_REPORT_FINAL.txt` (ignored by git but referenced from the doc). Keep both in sync when future dashboard epics ship.

## 2026-01-04 — Tickets lifecycle + Ticketizer rejects ledger

New docs:
- docs/TICKETS_LIFECYCLE_AND_REJECTS_LEDGER.md
- docs/RUNBOOK_INGRESS_DNS_HARDENING.md
