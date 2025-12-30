# Prism-Apex A2 UI Design System (V2)

> Canonical design system for the Prism-Apex operator dashboard (V2).
> This document defines the visual language (tokens, typography, components)
> that all V2 dashboard pages **must** use.

---

## 1. Purpose & Scope

The A2 UI Design System exists to enforce a **single, coherent visual language** across:

- The V2 operator dashboard (`apps/dashboard`),
- The canonical UI specs in `docs/ui/specs/`,
- The static HTML mocks in:
  - `worklist-mock/`
  - `tickets-mock/`
  - `system-mock/`
  - `strategy-lab-mock/`
  - `markets-mock/`
  - `analytics-mock/`

This document is **CANONICAL**:

- UI specs (`docs/ui/specs`) define **layout and behaviour**.
- This design system defines **look & feel** (tokens, fonts, components).
- The mocks are **visual reference artefacts** that must be consistent with this design system.

All canonical V2 pages (WorklistV2, Tickets, Markets, Analytics, StrategyLab, Status/System, Alerts)
must use these tokens and components, not ad-hoc Tailwind classes or bespoke styling.

---

## 2. Visual Tokens

### 2.1 Core Palette

The A2 palette is a **dark, low-noise shell** with high-contrast content panels
and a single, strong accent.

All colours are expressed as CSS variables and must be referenced via those
variables in code (never raw hex or Tailwind colour names) for **structural UI**.

#### Shell & Surfaces

- `--bg-shell`  
  The global page background (ExecutionShell). Deep, neutral navy/graphite.  
  Used on `<body>` / root shell.

- `--bg-header`  
  Row background for page headers, sticky filter bars, and top strips.  
  Slightly elevated over `--bg-shell`.

- `--bg-panel`  
  Default card/panel background for content areas.  
  Used by canonical `Card` components and most dashboard panels.

- `--bg-table`  
  Table background and row base surface.  
  Used by canonical `DataTable` for both headers and body.

- `--bg-deep`  
  Optional “well” or inset background for emphasised metrics or charts.

#### Text

- `--text-primary`  
  Default foreground for titles and primary content text.

- `--text-secondary`  
  For secondary labels, muted descriptions, timeframes, etc.

- `--text-muted`  
  For helper text, subtle hints, and low-priority labels.

These text tokens are the **only** colours that should be used for body copy on
dark surfaces. No direct Tailwind `text-slate-*` classes on canonical pages.

#### Accent & Semantic Colours

- `--accent-primary`  
  The primary A2 accent (cyan).  
  Used for key highlights, selected states, primary focus outlines, and
  important chart accents.

- `--accent-soft`  
  Softer accent tone used for fills, subtle glows, and non-critical highlights.

- `--accent-strategy`  
  Secondary accent used for strategy-related pills, tags, or sparklines.

Semantic tones:

- `--tone-green` – positive, realised PnL, “good” regimes, healthy systems.  
- `--tone-amber` – warning, degraded health, elevated risk.  
- `--tone-red` – errors, breaches, failed jobs, blocked tickets.  
- `--tone-neutral` – informational, default chip backgrounds.

Every pill/badge/metric that communicates status must map to one of these
semantic tones. Hard-coded `#22c55e` / `#facc15` etc inside pages is not allowed.

#### Borders & Dividers

- `--border-subtle`  
  Super-light border for cards and panels (barely visible, just enough to hold shapes).

- `--border-strong`  
  Stronger border used sparingly (critical callouts, focused states).

- `--border-soft-accent`  
  Accent-tinted border used for selected cards, active filters, or active tabs.

Table and layout separators must derive from these tokens; no raw `border-slate-*`
for canonical layouts.

---

### 2.2 Radii, Shadows & Density

#### Corner Radii

The default look is **soft but not bubbly**:

- `--radius-card` – default card radius (applied to `Card`).  
- `--radius-pill` – pill / badge radius (fully rounded, pill shape).  
- `--radius-input` – inputs, selects, and small controls.

The exact numeric values are implemented in CSS; pages should only rely on
component usage (`Card`, `Badge`, `Button`) to inherit them.

#### Shadows & Elevation

A2 prefers **subtle elevation** rather than heavy drop shadows:

- `--shadow-panel`  
  Default shadow for cards and key panels.

- `--shadow-glow-accent`  
  Optional glow around high-value metrics or live indicators
  (for example, cyan-tinged glow used sparingly on Worklist).

All shadows must be applied via components or utility classes defined in
`index.css` / theme; pages should not hand-roll box-shadow values.

#### Spacing & Layout Density

Base spacing grid:

- `--space-xs` – tight elements (icon gaps, labels).  
- `--space-sm` – standard inline gaps in toolbars and pill groups.  
- `--space-md` – default spacing between sections in cards.  
- `--space-lg` – spacing between major page sections or card grid rows.

The dashboard is **dense but readable**:

- Filter bars are compact and single-row where possible.
- Card interiors use consistent padding (e.g. `--space-md` around edges).
- KPI rows use tighter vertical padding but maintain clear separation.

---

## 3. Typography

### 3.1 Font Families

The design system uses **two roles**:

- **Primary UI font** – modern grotesk for all standard text:
  - Utility class: `.font-satoshi` (actual font configured in CSS).  

- **Numeric / mono font** – for PnL, prices, and metrics:
  - Utility class: `.font-geist-mono`.

Rules:

- Page titles, labels, table headers, and prose use `.font-satoshi`.
- All PnL, prices, quantities, ATR values, and numeric KPIs use `.font-geist-mono`.

### 3.2 Type Scale (Semantic)

Pages should address typography via **semantic roles**, not fixed pixel sizes:

- **Page Title** – large, bold, primary colour (e.g. “Worklist”, “Tickets”).  
- **Section Title** – smaller than page title; used in card headers.  
- **Label** – smaller, secondary colour, often uppercase for chips/badges.  
- **Body** – default text for descriptions and content.  
- **Caption / Meta** – smallest, muted for timestamps and low-priority info.

Utility classes (e.g. `.kpi-label`, `.kpi-value`) defined in CSS must be used for
KPI tiles and metrics instead of locally defined font/size combinations.

---

## 4. Core Components

This section describes the **canonical A2 components** that all dashboard pages must use.
Their actual implementations live in `apps/dashboard/src/ui/*.tsx`.

### 4.1 Shell & Layout

#### Execution Shell

- Component: `ExecutionShell` (`apps/dashboard/src/layouts/ExecutionShell.tsx`)
- Responsibilities:
  - Apply `--bg-shell` as the page background.
  - Host global system bars (environment, risk banners, EOD countdown).
  - Provide the main content viewport for all pages.

All V2 pages must render **inside** `ExecutionShell` (directly or via `DashboardShell`).

#### Dashboard Shell

- Component: `DashboardShell`
- Responsibilities:
  - Provide a standardised layout grid for:
    - Page header row (title, environment tags, right-side controls).
    - Optional filter bar row.
    - Card grid/container section.
  - Ensure consistent padding and max-width behaviour.

No page should hand-roll its own shell layout for V2; use `DashboardShell`.

---

### 4.2 Card

- Component: `Card` (`apps/dashboard/src/ui/Card.tsx`)
- Visual rules:
  - Background: `--bg-panel`.
  - Border: `--border-subtle` (thin, low-contrast).
  - Radius: `--radius-card`.
  - Shadow: `--shadow-panel` (subtle).

Usage rules:

- **All** major content blocks (tables, charts, metrics) live inside a `Card`.
- Cards may expose subcomponents (e.g. header/body) for consistent padding,
  but pages must not override base background/border/shape.

---

### 4.3 Badge / Pill

- Component: `Badge` (`apps/dashboard/src/ui/Badge.tsx`)
- Visual rules:
  - Uppercase, mono font (`.font-geist-mono`).
  - Pill shape (`--radius-pill`).
  - Tone-driven colour variants:
    - `tone="green"` – success, good regimes, healthy systems.
    - `tone="amber"` – warnings, partial issues.
    - `tone="red"` – errors, risk breaches, failures.
    - `tone="neutral"` – default subtle label.
    - `tone="blue"` / `tone="strategy"` – strategy classification where needed.

Implementation:

- Badge must map `tone` → semantic tokens:
  - background: `--tone-*` with opacity as needed.
  - border: `--border-soft-accent` or tone-specific border.
  - text: `--text-primary` or `--text-secondary` depending on contrast.

Pages must **not** define their own pill classes for statuses; use `Badge`.

---

### 4.4 Buttons

- Component: `Button` (`apps/dashboard/src/ui/Button.tsx`)
- Variants:
  - `variant="primary"` – accent background, used for main actions.
  - `variant="secondary"` – low-contrast, outlined or subtle background.
  - `variant="ghost"` – minimal chrome, for less critical actions.

Buttons must use accent and text tokens and conform to the shared size/radius spec.
Tailwind `bg-slate-*` or arbitrary `text-*` is not allowed on canonical buttons.

---

### 4.5 Tabs

- Component: `Tabs` (`apps/dashboard/src/ui/Tabs.tsx`)
- Visual rules:
  - Underline/indicator uses `--accent-primary`.
  - Active tab text uses `--text-primary`; inactive uses `--text-secondary`.
  - Background remains `--bg-header` or `--bg-shell` (no per-page palette).

Tabs should be used wherever we switch between “views” inside a page,
e.g. PnL vs risk, ORR vs OSB, per-symbol detail panels.

---

### 4.6 Filters Bar

- Component: `FiltersBar` (`apps/dashboard/src/ui/FiltersBar.tsx`)
- Responsibilities:
  - Host filter inputs (symbol, strategy, risk bucket, score, age).
  - Normalise spacing, density, and label treatment for filters.

Filters must be **compact and single-row** wherever possible. Pages must not hand-roll
their own filter row layout; they should compose `FiltersBar` with appropriate children.

---

### 4.7 KPI Tiles

- Component: `Kpi` (`apps/dashboard/src/ui/Kpi.tsx`)
- Visual rules:
  - Use `.kpi-label` and `.kpi-value` utilities.
  - Values in `.font-geist-mono` for numeric emphasis.
  - Optional delta / badge indicating direction (up/down, colour-coded).

All key numeric metrics (OR width, ATR multiple, daily loss used, system health score)
should use `Kpi` instead of bespoke markup.

---

### 4.8 Data Table

- Component: `DataTable` (`apps/dashboard/src/ui/DataTable.tsx`)
- Responsibilities:
  - Implement the base table look:
    - Header background aligned with `--bg-header` / `--bg-table`.
    - Row hover and selection using A2 tokens.
    - Borders using `--border-subtle`.

All canonical tables (Worklist, Tickets, Markets, Analytics grids) must go through `DataTable`.
Page files should not define their own `table` markup with raw Tailwind styling.

---

## 5. Page-Level Application

Each V2 page has a canonical spec in `docs/ui/specs/` and a corresponding mock:

- **WorklistV2**
  - Spec: `docs/ui/specs/worklist.md`.
  - Mock: `worklist-mock/index.html`.
- **Tickets**
  - Spec: `docs/ui/specs/tickets.md`.
  - Mock: `tickets-mock/index.html`.
- **Markets**
  - Spec: `docs/ui/specs/markets.md`.
  - Mock: `markets-mock/index.html`.
- **Analytics**
  - Spec: `docs/ui/specs/analytics.md`.
  - Mock: `analytics-mock/index.html`.
- **Strategy Lab**
  - Spec: `docs/ui/specs/strategy-lab.md`.
  - Mock: `strategy-lab-mock/index.html`.
- **System / Status**
  - Spec: `docs/ui/specs/system.md`.
  - Mock: `system-mock/index.html`.

For each page:

1. **Layout** is taken from the spec (`docs/ui/specs`).
2. **Visual styling** (colours, fonts, density) must match:
   - This design system’s tokens and component rules, and
   - The HTML mock for that page.

Acceptance criteria for a “visually aligned” page:

- Uses `ExecutionShell` and `DashboardShell` correctly.
- Uses `Card`, `Badge`, `Button`, `Tabs`, `FiltersBar`, `Kpi`, `DataTable`:
  - No bespoke structural components that duplicate these roles.
- Uses A2 tokens (via CSS variables and component classnames):
  - No `bg-slate-*`, `text-slate-*`, or random hex codes for structural styling.
- Uses `.font-satoshi` for text and `.font-geist-mono` for numeric content.
- When compared side-by-side with the mock:
  - Palette, density, and pill styles are recognisably identical.

---

## 6. Implementation Notes & Enforcement

### 6.1 Where Tokens Live

Implementation of these tokens currently resides in:

- `apps/dashboard/src/index.css` – A2 dashboard CSS tokens and utilities.
- `apps/dashboard/src/theme/tokens.css` – broader Apex tokens.

For V2 dashboard work:

- Use `index.css` tokens and utilities for dashboard pages.
- If a new token is required, add it to `index.css` and document it here.

### 6.2 Allowed Deviations

Minor deviations are allowed **only** if:

- The UI spec explicitly calls out a different treatment, **and**
- That deviation is added to this design system doc.

Otherwise, pages must conform.

### 6.3 Future Work (EPIC V2.6)

EPIC V2.6 in `docs/PRISM_APEX_V2_DASHBOARD_PLAN.md` governs:

- Completing this design system.
- Refactoring existing V2 pages to use these tokens and components.
- Ensuring each page passes a “mock parity checklist” (page vs mock vs spec).

Any structural or major visual change to V2 pages must be reflected in this document
and in the corresponding UI specs.

---

*End of document.*
