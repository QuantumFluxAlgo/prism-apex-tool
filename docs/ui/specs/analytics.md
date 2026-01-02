# **PRISM APEX — ANALYTICS PAGE (PERFORMANCE & DRIFT)**

**A2 Variant — Satoshi + Geist Mono, Updated Colours & Visual Language**

## **1. Purpose of the Analytics Page**

The Analytics Page provides a **high-level performance and drift
diagnosis** of the Prism Apex execution engine.

It answers four critical questions:

1.  **Are we profitable?** (absolute performance)

2.  **Are we consistent?** (regime-sensitive performance)

3.  **Are we drifting?** (score drift, R:R drift)

4.  **Are configs degrading?** (config impact comparison)

It is **non-execution**; purely analytical.  
Its outputs inform:

- Worklist thresholds

- Strategy Lab config changes

- Risk adjustments

This is the **diagnostic dashboard** used by the operator, strategist,
and risk lead.

## **2. Layout Overview**

The A2 Analytics Page is structured into:

1.  **Sticky Filter Bar  **

2.  **KPI Row  **

3.  **Four Primary Charts  **

4.  **Performance Table  **

Visual structure (ASCII):

┌────────────────────────────────────────────────────────────────────────────┐

│ FILTER BAR │

├────────────────────────────────────────────────────────────────────────────┤

│ KPI ROW (4 compact KPI cards) │

├────────────────────────────────────────────────────────────────────────────┤

│ PnL / Score by Day \| Win% by Regime & ATR │

├────────────────────────────────────────────────────────────────────────────┤

│ Score Drift \| Config Impact Comparison │

├────────────────────────────────────────────────────────────────────────────┤

│ STRATEGY PERFORMANCE TABLE │

└────────────────────────────────────────────────────────────────────────────┘

All charts use **flat dark backgrounds**, **A2 colours**, and **Geist
Mono** for all numeric values.

## **3. Sticky Filter Bar**

Filters:

- Date Range

- Symbol

- Strategy

- Market Regime

- Volatility State

- Search (notes / anomalies / flags)

### **A2 Styling**

- Background: \#13161C

- Pill borders: rgba(124,144,214,0.9)

- Search input:

  - Rounded full pill

  - Accent cyan outline on focus

## **4. KPI Row (4 Metrics)**

A compact grid of four primary KPIs showing performance health:

- **Net PnL (R-multiple)  **

- **Win Rate  **

- **Max Drawdown  **

- **Average R:R  **

### **A2 KPI Card Styling**

- Background: rgba(6,10,26,0.96)

- Border: 1px solid rgba(125,146,222,0.9)

- Text:

  - Label → Satoshi, 11px, muted

  - Value → Geist Mono, 13px, bright \#E8EDF9

  - Delta → green/red depending on good/bad change

### **Delta Colours**

- **Good:** A2 green \#4BE8A3

- **Bad:** A2 red \#FF6A6A

## **5. Chart 1: Daily PnL + Score Overlay**

A 1×1 chart panel comparing:

- **Daily PnL** (cyan line)

- **Average Score** (green signal line)

### **Chart Requirements (A2)**

- Background: \#050814

- Gridlines: subtle horizontal (rgba(255,255,255,0.06))

- Line thickness: 1.6px

- No gradients

- Numeric labels: Geist Mono

- Legend:

  - Cyan dot → PnL

  - Green dot → Avg Score

### **Purpose**

Shows consistency and profitability over time.

## **6. Chart 2: Win % by Regime & ATR**

A 1×1 bar chart showing:

- TrendUp

- TrendDn

- Chop

- OR Break

Each bar height represents **win rate**, with colour reflectivity set to
A2 cyan.

### **A2 Styling**

- Bars: Solid cyan \#42E2F4

- Background: \#050814

- Labels: Satoshi 11px

- Win rate values: Geist Mono 11px

### **Purpose**

Reveals which regimes the strategy suite excels in.

## **7. Chart 3: Score Drift Analysis**

A line-level drift analysis:

- **Score Drift** (cyan or purple)

- **R:R Drift** (green dashed line)

### **A2 Rules**

- Drift graphs use flat dark background

- Horizontal gridlines only

- Drift lines use:

  - Score drift → A2 purple \#9B5CFF

  - R:R drift → A2 green dashed

### **Purpose**

Detects deterioration in:

- Signal quality

- Execution alignment

- Risk behaviour

## **8. Chart 4: Config Impact Comparison**

Shows:

- **Current Config Performance** (solid cyan line)

- **Suggested Config Performance** (green dashed line)

### **A2 Styling**

- Background: \#050814

- Current config → \#42E2F4

- Suggested → \#4BE8A3 dashed (5 3)

- No gradient fill

- Legend appears on bottom edge of panel

### **Purpose**

Quantifies whether a config change in Strategy Lab might help.

## **9. Strategy Performance Table**

A summary table with:

- Strategy

- Symbol

- Regime

- Win%

- Avg R

- Profit Factor

- Trade Count

### **A2 Table Styling**

- Row background:

  - \#080D1C

  - \#090F1C (alternating)

- Hover: subtle lift + cyan outline

- Borders: rgba(255,255,255,0.04)

- Header row:

  - Background \#131724

  - Font Satoshi

- Values: Geist Mono

Table is scrollable with sticky headers.

## **10. Colour Palette — Analytics Page (A2 Variant)**

| **Element**      | **Value**              |
|------------------|------------------------|
| Page Shell       | \#050814               |
| Panel Background | \#080D1C               |
| Chart Background | \#050814 (flat)        |
| Accent Cyan      | \#42E2F4               |
| Secondary Blue   | rgba(125,146,222,0.9)  |
| Text Primary     | \#E8EDF9               |
| Text Secondary   | \#A1A9C3               |
| Text Muted       | \#6C7594               |
| Green (positive) | \#4BE8A3               |
| Amber            | \#FFC466               |
| Red (negative)   | \#FF6A6A               |
| OR Purple        | \#9B5CFF               |
| Border Subtle    | rgba(255,255,255,0.07) |
| Gridline         | rgba(255,255,255,0.06) |

## **11. Typography Rules**

- **Main**: Satoshi

- **Numeric**: Geist Mono

- Chart labels: 10–11px

- KPI labels: 11px

- KPI numbers: 13px

- Table numbers: 11px

- Table headers: 11px, uppercase spacing optional

## **12. Interaction Rules**

- Hover on chart points: small tooltip (A2 panel style)

- Hover on bars: show win% in tooltip

- Hover on lines: highlight segment with brighter stroke

- Rows in performance table highlight on hover (cyan accent)

- Sticky filters & sticky table headers

## **13. Example Snapshot (Textual)**

KPI Row:

\- Net PnL: +24.6R (+3.2R vs prev)

\- Win Rate: 63% (+5pp)

\- Max Drawdown: -3.4R (-0.8R)

\- Average R:R: 1.9 (-0.1)

Daily PnL & Score Chart:

\- Cyan line tracks PnL

\- Green line tracks Avg Score

Regime Chart:

\- TrendUp: 71%

\- TrendDn: 58%

\- Chop: 52%

\- OR Break: 66%

Drift Chart:

\- Score drift improving

\- R:R drift stable

Config:

\- Current vs Suggested (green dashed outperforming)

## **14. Summary**

The Analytics Page under A2 styling is:

- Clean

- Operator-focused

- Consistent with Worklist / Tickets / Markets / System / Lab

- Flat-background charts (no gradients)

- Premium fintech aesthetic

- High readability via Satoshi + Geist Mono

All content and layout respect your original document — only visuals,
typography, and styling have been modernised.
