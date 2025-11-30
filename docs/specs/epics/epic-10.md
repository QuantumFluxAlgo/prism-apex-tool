# **📘 EPIC 10 — UI V2 Polish (Rewritten for Unified Ticket Model)**

## **10.1 Background**

The V2 UI aims to deliver a cohesive, modern, operator-focused interface
across all pages of the Prism Apex Tool. In V1, UI components were
inconsistent in styling, data formatting, price representations, and
dependency alignment across Worklist, Market Context, Strategy Lab, and
Reports.  
With V2, the UI must adopt a unified design foundation, fully aligned
with the **canonical ticket model**, displaying **absolute
entry/stop/target prices**, consistent tick metadata, and deterministic
risk metrics across all surfaces.

This epic defines the cross-application refinements required to deliver
a polished, professional, standards-driven UI that improves operator
clarity, reduces cognitive load, and eliminates divergence between
pages.

## **10.2 Objectives / Goals**

1.  Standardise all UI components under a unified V2 design system.

2.  Display absolute pricing (entry/target/stop) consistently across all
    pages.

3.  Ensure tick deltas appear only as secondary metadata, not primary UI
    elements.

4.  Deliver consistent rendering of risk metrics, session metrics, and
    ticket metadata.

5.  Improve readability, spacing, typography, and colour system across
    all modules.

6.  Ensure UI responsiveness and performance under high-frequency
    updates.

7.  Remove behavioural inconsistencies between Worklist, Lab, Market
    Context, and Reports.

## **10.3 Functional Requirements**

### **10.3.1 Unified Visual Design System**

All pages must adopt:

- A single typography scale

- Consistent colour palette for LONG/SHORT, risk, and metadata

- Unified grid spacing and layout rules

- Harmonised card, table, and modal components

- Standardised iconography for strategy, risk, and state indicators

These design tokens must be centrally defined and reused across all
pages.

### **10.3.2 Absolute Price Representation Standards**

All operator-facing surfaces must:

- Display **entry_price**, **target_price**, **stop_price** as primary
  values

- Display tick deltas as secondary metadata (subtext or hover)

- Use consistent numeric formatting

- Visually differentiate stop vs target price markers

- Enforce correct directional semantics:

  - LONG: target above entry above stop

  - SHORT: stop above entry above target

This requirement applies to Worklist, Market Context, Strategy Lab,
Reports, and any auxiliary UI component.

### **10.3.3 Unified Risk Display Components**

Create a single standard component for risk metrics, displaying:

- Quantity

- Per-contract risk (currency)

- Total risk (currency)

- R-multiple

- Tick distances (secondary)

This component must be visually identical wherever risk is shown
(Worklist, Lab, Reports).

### **10.3.4 Table & Grid Polish**

All tables must support:

- Fixed column hierarchy (Symbol, Side, Entry, Target, Stop, Qty, Risk,
  R)

- Consistent cell alignment and spacing

- Clean hover/active row states

- Uniform sorting and filtering icons

- Sticky headers for long datasets

- Equalised column widths for pricing fields

The Worklist table becomes the UI reference standard.

### **10.3.5 Chart Polish & Consistency**

Charts used in Market Context and Strategy Lab must:

- Use the same price marker styles (entry/target/stop)

- Maintain consistent colour and line rules

- Use a single time-axis formatting standard

- Provide unified tooltip structure

- Support overlay toggles using shared UI controls

Expected markers must snap to grid visually and follow canonical values.

### **10.3.6 Metadata Panel Refinement**

Metadata panels across pages must use:

- Standardised card layouts

- Consistent grouping of metrics (ATR, OR width, VWAP slope, regime)

- Uniform typography and spacing

- Canonical field ordering

Operators must immediately recognise metadata components regardless of
page.

### **10.3.7 Modal & Detail View Standardisation**

All modals (ticket detail, preview, trade breakdown) must adopt:

- A uniform header/footer structure

- Standard spacing and padding

- Consistent “Details” and “Metadata” sections

- Canonical ordering of ticket fields

- Shared risk component embedding

Modal content must match table and chart data exactly.

### **10.3.8 Performance & Data Handling Requirements**

The UI must:

- Handle high-frequency data updates efficiently

- Avoid unnecessary recalculation or re-rendering

- Defer heavy analytics to backend systems

- Cache data where appropriate

- Apply debouncing to avoid jittering

- Maintain sub-100ms interaction responsiveness

### **10.3.9 Platform Consistency Rules**

Across all pages:

- Price, tick, and risk fields must always come from backend canonical
  data

- No UI-side reconstruction of values

- No mismatches between Worklist, Reports, or Lab

- Styling must remain consistent even under dark mode/light mode if
  applicable

## **10.4 Validation Rules**

1.  **Canonical Formatting Compliance  **

    - Absolute prices displayed in all primary positions.

    - Tick deltas used only for supplementary metadata.

2.  **Styling Consistency  **

    - Every table, chart, panel, and modal must follow design tokens.

3.  **Risk Display Accuracy  **

    - R-multiple, risk metrics, and tick distances must match canonical
      backend values exactly.

4.  **Component Reuse  **

    - All V2-standard components must replace legacy UI fragments.

5.  **Latency & Performance  **

    - UI interactions remain responsive under load.

6.  **Cross-Page Data Consistency  **

    - The same ticket ID must show identical values across Worklist,
      Lab, Context, and Reports.

## **10.5 Logging & Observability**

UI must log:

- Rendering failures

- Invalid or missing fields from API responses

- Latency spikes and slow component mounts

- Mismatches between expected and received canonical ticket fields

- Operator interaction metrics (optional)

- Any inconsistent formatting or schema drift detection

Logs must be visible in the System Health Console (EPIC 9).

## **10.6 Acceptance Criteria**

1.  All pages adhere to V2 visual and interaction standards.

2.  Absolute entry/stop/target prices are consistent across every UI
    surface.

3.  Tick deltas are displayed only as secondary metadata.

4.  Risk components show accurate, canonical Risk Engine values.

5.  All tables, charts, panels, and modals use standardised styling.

6.  UI shows no discrepancies between Worklist, Lab, Reports, or
    Context.

7.  All visual components are consistent, clear, and operator-focused.

8.  Performance remains responsive under full load.

9.  No UI-side price or risk derivation exists anywhere.

10. The UI provides a polished, professional, production-ready operator
    experience.
