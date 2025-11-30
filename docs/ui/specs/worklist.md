✅ PRISM APEX — WORKLIST PAGE (EXECUTION) UI DESIGN SPEC  
Operator Execution Page — Detailed UI Definition  
Aligned with the global Prism Apex UI/UX Design System (A2 Variant —
Satoshi + Geist Mono)

### **1. Purpose of the Worklist Page**

The Worklist Page is the real-time execution interface for the
operator.  
It shows only tradeable, high-priority signals that pass:

- Risk controls

- Apex constraints

- Strategy filters

- Time-decay limits (≤ 30 minutes old)

- Signal arbitration rules

It is designed to be:

- Fast

- Informative

- Operator-first (minimal friction to “understand and act”)

The Worklist is the **source of truth for what can be traded right
now**, not a generic list of ideas.

### **2. Layout Overview (High Level)**

The page layout:

- Top: Global App Shell (re-uses main Prism Apex shell)

- Below Shell: Page Header (title + clock + environment tags)

- Below Header: Filters (worklist-level filters, sticky)

- Main Body:

  - Left: Worklist table (live signals)

  - Right: Details panel for selected row

ASCII layout (conceptual):

┌────────────────────────────────────────────────────────────────────────────┐

│ PRISM APEX SHELL (global navigation, user, environment) │

├────────────────────────────────────────────────────────────────────────────┤

│ WORKLIST HEADER: Title \| Clock \| Environment Tags │

├────────────────────────────────────────────────────────────────────────────┤

│ FILTERS: Symbol \| Strategy \| Min Score \| Risk \| Max Age \| Search
│

├────────────────────────────────────────────────────────────────────────────┤

│ ┌──────────────────────────────┐
┌─────────────────────────────────────┐ │

│ │ LEFT TABLE │ │ RIGHT DETAILS PANEL │ │

│ │ (Live Worklist Signals) │ │ (Selected Signal Drilldown) │ │

│ └──────────────────────────────┘
└─────────────────────────────────────┘ │

└────────────────────────────────────────────────────────────────────────────┘

Detailed breakdown:

- Top Filter Bar (sticky)

- Main Worklist Table (left)

- Right-side Details Panel (on row select / click)

### **3. Top Filter Bar (Sticky)**

**Filters Included**

- Symbol (dropdown)

- Strategy (multi-select: ORR, OSB, VWAP-FT)

- Minimum Score (slider or dropdown)

- Risk Level Selector (Green / Amber)

- Max Age: Hard limit ≤ 30 minutes

- Strategy Mute Toggles (ORR / OSB / VWAP-FT)

- Search field (text search)

**Behaviour**

- Instant filtering

- Smooth row fade transitions (150ms)

- Clear indicators when a filter hides rows

- Strategy mutes reduce opacity of muted rows (or hide them entirely)

**Visual Style (A2 Variant)**

- Background: deep A2 shell background (#050814) with darker panel
  interior (#080D1C)

- Bottom border: thin A2 accent line (electric cyan \#42E2F4, low
  opacity)

- Horizontal spacing: 12–16px

- Typography: Satoshi (UI) + Geist Mono (numeric / ticks / IDs)

### **4. Main Worklist Table**

The Worklist Table displays live, tradeable signals updated continuously
as new bars arrive.

**Core Columns**

- Score

- Strength

- Strategy

- Risk

- Contracts

- Entry

- Stop

- Target

- R:R

- Market Context (tags)

- Time Remaining

- Sparkline

**Visual & Interaction Rules**

**Row Behaviour**

- Hover → subtle A2 accent outline + 4–6% brightness lift (no gradient)

- Active (clicked) → 4px A2 accent left bar + soft outer glow (shadow,
  not neon)

- Muted strategies: low opacity or hidden (respecting mute settings)

**Column Definitions**

**Score (numeric)**

- Composite score (0–100)

- Higher = stronger candidate

- Displayed as integer, e.g. 94

**Strength (visual indicator)**

- Shows direction / conviction (not the same as score)

- Represented as:

  - Up: ↑ or “STRONG” (green)

  - Flat: → or “NEUTRAL” (muted)

  - Down: ↓ or “WEAKENING” (amber/red)

**Strategy**

- ORR / OSB / VWAP-FT

- Simple text with strategy tag styling

**Risk**

- Risk bucket: GREEN / AMBER (RED typically filtered out of Worklist,
  but spec should allow it)

- Styled as pill:

  - GREEN → green pill

  - AMBER → amber pill

  - RED → red pill (if ever displayed)

**Contracts**

- Number of contracts (integer)

- Must reflect Apex rules and internal risk constraints

**Entry**

- Proposed entry price

**Stop**

- Stop distance in ticks (e.g. -8t)

- Always shown as negative tick value

**Target**

- Target distance in ticks (e.g. +16t)

**R:R**

- Risk:Reward ratio (e.g. 2.0)

- Derived from Stop vs Target

**Market Context (Tags)**

- Context tags block (VWAP, OR, ATR/regime)

- Must show at least:

  - Regime (TrendUp / TrendDn / Chop etc.)

  - VWAP Position

  - OR context

  - Volatility / ATR context

**Time Remaining**

- Countdown in minutes until signal expiry

- Max: 30 minutes

- Example: 12m remaining

**Sparkline**

- Tiny sparkline representing score trend or price trend over last N
  bars

- Purely for at-a-glance momentum context

### **5. Market Context Tags (Worklist Row)**

Each Worklist row contains a “Market Context” block composed of:

- Regime (e.g. TrendUp / TrendDn / Chop)

- Volatility (e.g. ATR High / ATR Low / ATR Mid)

- VWAP Position (Above / Below, deviation band)

- OR Context (Inside Range / Outside Range)

These appear as compact, low-saturation tags.

### **6. Strength Indicator**

Strength reflects the momentum of the score:

- E.g. a score of 90 trending down is not the same as a score of 84
  trending up.

This is crucial for fast operator scanning.

### **7. Trend Arrow (Price Trend)**

A micro-trend indicator separate from score strength:

- Shows recent price trend direction (e.g. last N bars)

- Placed next to contracts or near score.

### **8. Contracts, Entry, Stop, Target, R:R**

These are the core trade parameters surfaced to the operator.

**Contracts**

- Integer

- Must always respect Apex and internal risk guardrails

**Entry**

- Price at which the trade would be entered

**Stop**

- Always represented in ticks relative to entry

- Shown as negative ticks, e.g. -8t

**Target**

- Always represented in positive ticks, e.g. +16t

**R:R**

- Derived metric: TargetTicks / \|StopTicks\|

- Example: Stop = -8t, Target = +16t → R:R = 2.0

### **9. Time Remaining (Expiry)**

Signals have a strict age limit (≤ 30 minutes).

- Column displays remaining time in minutes, e.g. 22m

- Once it hits 0 or exceeds the limit, signal is removed from the
  Worklist (or visibly marked expired and dropped shortly after,
  depending on implementation details).

### **10. Sparkline**

The Sparkline column provides a tiny visual of:

- Score trend over the last N bars or

- Price trend in a very compressed visual

Key properties:

- Low-height (approx. 12–16px)

- No axes, no labels

- Slight brightness difference vs background

- Used only for quick scanning, not precision analysis

### **11. Numeric Fonts (A2 Variant)**

- All numeric cells use Geist Mono (consistent with A2 mock and
  dashboards)

- This includes:

  - Score

  - Contracts

  - Entry

  - Stop / Target / R:R

  - Time remaining

  - Any numeric tags in context

### **12. Colour Mapping (A2 Variant)**

Core mappings:

- GREEN → “OK to trade” (within configured constraints)

- AMBER → “Caution” (e.g. smaller size, more restrictive rules)

- RED → Typically not displayed in Worklist; if shown, “hard no”

Visual use:

- Neutral elements → A2 accent cyan (#42E2F4), used sparingly

- Borders and outlines → soft, low-contrast lines

- Backgrounds:

  - Page shell: \#050814

  - Panels: \#080D1C

  - Headers: \#0B1222

- Risk pills:

  - GREEN → \#4BE8A3

  - AMBER → \#FFC466

  - RED → \#FF6A6A

### **13. Right-Side Details Panel (On Row Select / Click)**

When a row is selected, the right-side Details Panel shows:

- Header (strategy / symbol / score / risk / timestamp)

- Trade Block (entry, stop, target, contracts, R:R)

- Market Context Details

- Score Breakdown

- Config Snapshot (with link / button to Strategy Lab)

- Notes (operator input — optional in mock, persisted in real system)

**Header Content**

- Strategy

- Symbol

- Score

- Risk bucket

- Timestamp

Example:

Strategy ORR \| Symbol ES \| Score 94 \| Risk GREEN \| 09:48:12

**Trade Block**

- Entry

- Stop (ticks and price if available)

- Target

- R:R

- Contracts

**Market Context Details**

- Regime

- ATR / volatility

- VWAP position

- OR context

**Score Breakdown**

- Shows how the score is constructed, e.g.:

  - Trend +20

  - VWAP +15

  - Volatility +10

  - Structure +12

Composite → 94

**Config Snapshot**

- Short line describing which config produced this signal

- Clickable action: “Open in Strategy Lab”

**Notes**

- Editable text area

- Used for operator annotations

### **14. ASCII Layout — Details Panel (Example)**

Conceptual ASCII layout for the Details Panel:

┌────────────────────────────────────────────────────────────────────────────┐

│ Signal Details │

├────────────────────────────────────────────────────────────────────────────┤

│ Strategy ORR \| Symbol ES \| Score 94 \| Risk GREEN \| 09:48:12 │

├────────────────────────────────────────────────────────────────────────────┤

│ Entry: 4522.50 \| Stop: -8t \| Target: +16t \| R:R 2.0 \| Contracts: 2
│

├────────────────────────────────────────────────────────────────────────────┤

│ Context: Regime TrendUp \| ATR High \| VWAP Above \| OR Outside Range
│

├────────────────────────────────────────────────────────────────────────────┤

│ Score Breakdown: Trend+20 \| VWAP+15 \| Volatility+10 \| Structure+12
│

├────────────────────────────────────────────────────────────────────────────┤

│ Config Snapshot: \[Open in Strategy Lab\] │

├────────────────────────────────────────────────────────────────────────────┤

│ Notes: \[ editable text area \] │

└────────────────────────────────────────────────────────────────────────────┘

The above layout is conceptual and should respect the A2 shell and panel
styling:

- Background: \#080D1C

- Border: subtle light border with A2 accent on focus states

- Typography: Satoshi (labels) + Geist Mono (numbers)
