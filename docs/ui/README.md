# Prism Apex A2 UI Documentation

This directory contains the canonical Prism Apex A2 UI specifications used by the dashboard.  
The Markdown files under `docs/ui/specs` are converted 1:1 from the original DOCX sources.

## Core Design System

- `PRISM_APEX_UI_DESIGN_SYSTEM.md`  
  Global A2 design system: typography, colours, spacing, Tailwind conventions, and general UI principles.

## Page Specs

- `specs/worklist.md`       – Worklist execution UI (filters, table, details panel, interactions).
- `specs/markets.md`        – Markets page (charts, overlays, signal log, context panels).
- `specs/analytics.md`      – Analytics page (KPIs, charts, performance breakdowns).
- `specs/system.md`         – System status page (health cards, logs, metrics).
- `specs/tickets.md`        – Tickets page (ticket list, filters, linking to Worklist/Analytics).
- `specs/strategy-lab.md`   – Strategy Lab page (config panel, backtests, previews).

## Components & IA

- `specs/ui-components.md`  – React & Tailwind component structures (shell, panels, tables, pills, detail sections, etc.).
- `specs/ui-pages.md`       – High-level UI/page IA and shared patterns.

## Usage Rules

- Before changing any Worklist/Markets/Analytics/System/Tickets/Strategy Lab UI, read the corresponding `specs/*.md` file **and** `PRISM_APEX_UI_DESIGN_SYSTEM.md`.
- New React/Tailwind work in `apps/dashboard` **must** follow these specs exactly:
  - Layout (panels, header, filter bar, left/right splits)
  - Filters and controls
  - Table columns and detail sections
  - Component usage from `specs/ui-components.md`
- If the implementation needs to diverge from these specs, update the Markdown here first, then align the code.
- Codex Terminal and human developers must treat `docs/ui` as the **authoritative source of truth** for operator-facing UX.
