# **📘 EPIC 6 — Market Context Page (Rewritten for Unified Ticket Model)**

## **6.1 Background**

The Market Context Page provides an operational, real-time view of price
action, session structure, and market regime to support operator
situational awareness. In V1, the page functioned primarily as a chart
and overlay viewer, without consistent integration to ticketing outputs.

In V2, the Market Context Page must align with the unified pricing and
ticket model. This includes:

- absolute entry/stop/target markers

- consistent side logic

- properly derived tick metadata

- aligned session metrics (ATR, OR width, VWAP context)

- clear visual representation of strategy signals and volatility
  environment

This page does **not** perform risk or strategy logic. It exists to
**visualise context**, **validate conditions**, and **support operator
decision-making**.

## **6.2 Objectives / Goals**

1.  Provide operators with high-clarity, high-signal visual overlays for
    intraday decision support.

2.  Display market structure indicators: VWAP, OR range, ATR-based
    bands, volatility regimes.

3.  Visualise strategy signals and their absolute entry, stop, and
    target levels using canonical ticket data.

4.  Ensure chart markers and overlays align precisely with unified tick
    and price logic.

5.  Offer consistent UI/UX with the Worklist, Strategy Lab, and Reports
    pages.

6.  Maintain a clean, unobstructed view suitable for operational
    monitoring.

## **6.3 Functional Requirements**

### **6.3.1 Market Structure Overlays**

The page must display:

- VWAP and standard deviation bands

- OR High, OR Low, and OR Width

- ATR-based range envelopes

- Session boundaries (RTH, ETH, user-configured sessions)

- Trend/slope indicators where applicable

These overlays must derive from the Session Metrics service using the
same canonical data as Epics 1 and 2.

### **6.3.2 Ticket Markers (Canonical Model Integration)**

The chart must support visual markers for tickets:

- Entry price (primary marker)

- Stop price (protective marker)

- Target price (reward marker)

- Side-indicated coloration (Long = green; Short = red)

- Optional subtext showing tick deltas (e.g. “+20 ticks”)

All price levels must be snapped to the symbol’s tick grid before
rendering.

Markers must reflect **Risk Engine–approved** tickets only.

### **6.3.3 Strategy Signal Visualization**

When strategies emit candidate signals (before risk approval), the page
may optionally display:

- Preliminary signal markers in a muted color

- VWAP-touch points

- OSB boundaries and breakout signals

- OR breakout triggers

These indicators help operators validate how signals align to market
structure.

### **6.3.4 Contextual Metadata Panel**

A side-panel must display contextual metrics:

- ATR, OR width, volatility regime

- VWAP slope and regime classification

- Session directional bias

- Recent ticket history (absolute prices and sizing metadata)

- Strategy metadata attached to tickets

The panel must use canonical fields from Strategy Orchestrator and Risk
Engine outputs.

### **6.3.5 Operator Interaction**

Operators must be able to:

- Toggle overlays (VWAP, OR, ATR, etc.)

- Toggle ticket markers on/off

- Zoom, pan, and view historic context

- Hover over markers to see absolute entry/stop/target data + tick
  deltas

- Expand contextual metadata on demand

No editing or ticket approval happens on this page.

## **6.4 Validation Rules**

1.  **Price Markers  **

    - All marker prices must align to canonical ticket fields.

    - Entry, stop, and target markers must appear in correct directional
      order:

      - LONG → Target \> Entry \> Stop

      - SHORT → Stop \> Entry \> Target

2.  **Overlay Accuracy  **

    - VWAP, OR, ATR values must match Session Metrics service.

    - No UI-side recalculation of market structure values.

3.  **Signal Integrity  **

    - Strategy signals displayed must map directly to orchestrator
      outputs.

    - No synthetic or inferred signals permitted.

4.  **State Consistency  **

    - Ticket markers must not display for invalidated or expired
      tickets.

    - Context metadata must match the exact session of the displayed
      chart.

## **6.5 Logging & Observability**

The Market Context Page must log:

- Overlay load events

- Ticket marker rendering events

- Metadata panel load time

- Session Metrics retrieval success/failure

- Any discrepancies between canonical ticket data and rendered markers

- Latency metrics for data fetching

These logs are consumed by EPIC 9 (System Health & Observability).

## **6.6 Acceptance Criteria**

1.  All overlays display correct, real-time market structure
    fundamentals.

2.  Entry/stop/target markers render with correct absolute prices and
    correct side logic.

3.  Tick deltas are visible only as secondary metadata (hover or
    subtext).

4.  No UI-side recalculation of prices or risk sizing takes place.

5.  All displayed tickets originate from Risk Engine–approved records.

6.  Operators can toggle overlays and markers without UI degradation.

7.  All marker positions and metadata match the canonical ticket model
    exactly.

8.  Performance remains responsive under full session data load.

