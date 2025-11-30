# **PRISM APEX — TICKETS PAGE (AUDIT & EXECUTION LOG)**

**A2 Variant — Satoshi + Geist Mono, Updated Colours & Styling**

## **1. Purpose of the Tickets Page**

The Tickets Page is the operator and audit surface for all historical
execution decisions, including:

- **Actioned trades  **

- **Rejected trades  **

- **Expired signals  **

- **Downranked tickets  **

It forms the **single source of truth** for trade decisions taken (or
prevented) by:

- Risk engine

- Strategy arbitration

- Apex funding rules

- Operator input

This page is not for execution — it is for **review, compliance,
debugging, and learning**.

## **2. Layout Overview**

The page is structured into:

1.  **Sticky Filter Bar** (top)

2.  **Tickets Table** (left or full-width depending on screen size)

3.  **Right-Side Details Panel** (ticket drilldown)

Layout concept diagram:

┌────────────────────────────────────────────────────────────────────────────┐

│ FILTER BAR │

├────────────────────────────────────────────────────────────────────────────┤

│ ┌─────────────────────────────┐
┌────────────────────────────────────────┐ │

│ │ TICKETS TABLE │ │ TICKET DETAILS PANEL │ │

│ └─────────────────────────────┘
└────────────────────────────────────────┘ │

└────────────────────────────────────────────────────────────────────────────┘

## **3. Sticky Filter Bar (Top)**

Filters available:

- **Date** (range selector or single-day)

- **Symbol** (multi-select: ES, NQ, CL, YM…)

- **Strategy** (multi-select: ORR, OSB, VWAP-FT)

- **Status** (Actioned, Rejected, Expired, Downranked)

- **Reason Category** (e.g., Risk Blocked, Age Expired, Arbitration)

- **Search** (ticket ID, reason text, notes)

### **A2 Visual Rules**

- Background: \#13161C

- Border bottom: A2 accent cyan \#42E2F4 (very low opacity)

- Pill style:

  - Dark navy fill: \#0B0F1C

  - Border: subtle rgba(124,144,214,0.9)

- Search bar:

  - Rounded pill

  - Inner shadow removed

  - Focus outline uses **A2 cyan  **

## **4. Tickets Table**

The table shows **all historical tickets** and is filterable,
scrollable, and designed for rapid scanning.

### **Columns**

- **Time  **

- **Symbol  **

- **Strategy  **

- **Score  **

- **Strength** (↑ → ↓)

- **Risk** (G / A / R)

- **Status** (Actioned / Rejected / etc.)

- **Reason Category  **

- **Reason Summary  **

- **Entry Price  **

- **Stop (ticks)  **

- **Sparkline  **

### **Row Styling (A2 Variant)**

- **Background**: alternating deep navy tones (#080D1C, \#090F1C)

- **Hover**:

  - Slight lift (0.2px, almost imperceptible)

  - Cyan outer stroke (#42E2F4 at ~12% opacity)

- **Selected Row**:

  - 4px cyan left-edge indicator

  - Subtle glow shadow (not neon, soft blur, high falloff)

### **Status Tags**

Using A2 colours:

| **Status** | **Tag Style**                                  |
|------------|------------------------------------------------|
| Actioned   | Green border/pill (#4BE8A3)                    |
| Rejected   | Red border/pill (#FF6A6A)                      |
| Expired    | Amber border/pill (#FFC466)                    |
| Downranked | Steel-grey border/pill (rgba(170,177,205,0.9)) |

Tag font: **Geist Mono 10px  **
Tag shape: fully rounded pill

### **Risk Pill**

| **Risk** | **Colour** |
|----------|------------|
| GREEN    | \#4BE8A3   |
| AMBER    | \#FFC466   |
| RED      | \#FF6A6A   |

Pills appear in the **Risk** column.

## **5. Strength Indicator (Arrow)**

Matches the Worklist page:

- **Strong Up** → ↑ (A2 green)

- **Flat / Neutral** → → (muted)

- **Weakening / Down** → ↓ (A2 red)

Represents *score trajectory*, not strategy confidence.

## **6. Reason Category & Reason Summary**

Two separate fields:

- **Reason Category  **

  - High-level programmatic reason

  - Example: Risk Blocked

- **Reason Summary  **

  - Human-readable explanation

  - Example: Exceeded max contract size

## **7. Numeric Columns**

Use **Geist Mono**:

- Score

- Entry

- Stop ticks

- Time

- Sparkline values (visual blocks)

Colour: var(--text) / \#E8EDF9

## **8. Details Panel (Right-Side Drilldown)**

Opened when selecting a ticket.

### **Sections**

1.  **Header  **

2.  **Trade Data Block  **

3.  **Score Breakdown  **

4.  **Context  **

5.  **Config Snapshot  **

6.  **Notes  **

### **8.1 Header Section**

Shows:

- Strategy

- Symbol

- Time

- Status

- Reason Category

Example:

ORR · ES · 09:52:12 · Rejected (Risk Blocked)

### **8.2 Trade Data Block**

Two-column grid:

- Entry Price

- Stop Price + ticks

- Target Price

- Contracts

- R:R

- Time in Force

### **8.3 Score Breakdown**

Simple text line:

Trend +18 \| VWAP +12 \| Volatility +9 \| Structure +10 → Composite 84

### **8.4 Context Grid**

Regime, ATR, VWAP Position, OR Context:

Regime: TrendUp

ATR: High

VWAP: Above

OR: Outside Range

### **8.5 Config Snapshot**

Example:

Config Snapshot: ORR_ES_Prod vs ORR_ES_Draft

Button: **Open in Strategy Lab** (A2 styling, cyan outline)

### **8.6 Notes**

Editable text area  
A2 styling:

- Background: \#050815

- Border: subtle A2 blue

- Font: Satoshi

- Colour: \#E8EDF9

## **9. Colour Palette — Tickets Page (A2 Variant)**

| **Element**          | **Colour / Token**     |
|----------------------|------------------------|
| Page Shell           | \#050814               |
| Panel Background     | \#080D1C               |
| Header Background    | \#0B1222               |
| Table Row Background | \#080D1C / \#090F1C    |
| Accent Cyan          | \#42E2F4               |
| Text Primary         | \#E8EDF9               |
| Text Secondary       | \#A1A9C3               |
| Text Muted           | \#6C7594               |
| Risk Green           | \#4BE8A3               |
| Risk Amber           | \#FFC466               |
| Risk Red             | \#FF6A6A               |
| Border Subtle        | rgba(255,255,255,0.07) |
| Border Accent        | rgba(66,226,244,0.8)   |
| Glow (selected row)  | rgba(66,226,244,0.25)  |

## **10. Typography Rules**

**Main font:** Satoshi  
**Numeric font:** Geist Mono  
Sizes:

- Header: 12–14px

- Table cells: 11–12px

- Tags: 10px

- Notes textarea: 11px

No gradients used anywhere.

## **11. Interaction Rules**

- Clicking a row replaces right-side details

- Row hover is soft (opacity + border)

- Selected row persists highlight

- Sticky header and filters remain visible during scroll

- Notes are editable but not persisted in the mock

## **12. Example Ticket Row (Textual Form)**

Time: 09:53:10

Symbol: ES

Strategy: ORR

Score: 87

Strength: ↑

Risk: GREEN

Status: Actioned

Reason Category: —

Reason Summary: Executed

Entry: 4521.75

Stop: -8t

Spark: ▄▅▆▄▃▆▇▇█▆▄▃
