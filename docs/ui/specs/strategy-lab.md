# **PRISM APEX — STRATEGY LAB PAGE (CONFIG, DELTAS & BACKTESTS)**

**A2 Variant — Satoshi + Geist Mono, Updated Colours & Visual Language**

## **1. Purpose of the Strategy Lab Page**

The Strategy Lab is the **configuration, tuning, and diagnostics control
panel** for ORR, OSB, and VWAP-FT.

It enables the operator or strategist to:

- View **all available config sets  **

- Inspect parameter differences

- Understand **config impact** using backtests

- Compare **current vs suggested** parameter sets

- Apply or reset config changes

- Audit scenario outcomes (TrendUp, Chop, Fakeouts, etc.)

The Strategy Lab is the brain-room of the system.  
All Worklist, Tickets, and Analytics pages feed into this one.

## **2. Layout Overview**

The Strategy Lab page consists of:

1.  **Filter Bar  **

2.  **Three-Column Main Layout  **

    - **Left:** Config Sets List + Suggestions

    - **Middle:** Active Config Editor

    - **Right:** Backtest Results + Scenario Tests

ASCII layout:

┌────────────────────────────────────────────────────────────────────────────┐

│ FILTER BAR │

├────────────────────────────────────────────────────────────────────────────┤

│ CONFIG SETS \| ACTIVE CONFIG EDITOR \| BACKTEST RESULTS │

│ (Left column) \| (Middle column) \| (Right column) │

└────────────────────────────────────────────────────────────────────────────┘

This layout is unchanged from your document, just upgraded visually
using A2 styling.

## **3. Filter Bar**

Filters:

- Strategy (ORR / OSB / VWFT)

- Symbol (ES / NQ / CL…)

- Config Set

- Environment (Sim / Prod)

- State (Saved / Last Updated HH:MM)

### **A2 Styling**

- Background: \#13161C

- Pill borders: rgba(124,144,214,0.9)

- Search input: rounded pill with A2 cyan border on focus

- Typography: Satoshi 11px

## **4. Left Column — Config Sets & Suggestions**

### **4.1 Config Sets (List)**

A vertical list of available configuration presets:

- Live sets

- Draft sets

- Strategist variant sets

- Machine-generated “what-ifs”

Each row displays:

- Config name

- Metadata (e.g., “Updated 09:12” / “Draft +3.2R improvement”)

### **A2 Row Styling**

- Background: \#090F22

- Border: 1px solid rgba(117,137,210,0.9)

- Active row:

  - Slight cyan glow

  - Background: \#0A122B

  - Shadow: soft A2 shadow

- Font:

  - Name: Satoshi 12px

  - Meta: Satoshi 10px (muted)

### **4.2 Suggestions**

A list of machine-evaluated suggestions, e.g.:

- **\[!\] Raise ORR rrBandMin in trend  **

- **\[!\] Reduce OSB size in chop  **

### **A2 Visual for Suggestions**

- Background: transparent

- Pill styling:

  - Amber border \#FFC466

  - Amber text \#FFE6BF

  - Font Satoshi 10px

## **5. Middle Column — Active Config Editor**

This is the most important section of the Strategy Lab page.  
It shows a **parameter-by-parameter diff** between:

- **Current Config  **

- **Suggested Config  **

- **Expected Impact  **

### **Table Columns**

1.  Parameter

2.  Current Value

3.  Suggested Value

4.  Impact Description

### **A2 Styling**

- Table backgrounds:

  - Rows: \#080D1C / \#090F1C

  - Header: \#131724

- Borders: subtle (rgba(255,255,255,0.04))

- Impact chips:

  - Good impact → Green pill \#4BE8A3

  - Risk reduction → Amber pill \#FFC466

  - Neutral/minor → Steel-blue pill rgba(149,161,220,0.9)

- Fonts:

  - Parameter name → Satoshi

  - Numeric values → Geist Mono

### **Common Parameters (examples)**

- rrBandMin

- maxContracts

- holdMinutes

- minScore

- ATRFactor

- ExitFactor

- Regime sensitivity toggles

### **5.1 Action Buttons**

Below the table:

- **Preview Impact  **

  - Cyan outline

  - Triggers new backtest

- **Apply Changes  **

  - Green outline

  - Commits config to system state

- **Reset  **

  - Steel-grey outline

  - Reverts to last saved version

A2 styling for all buttons:

- Rounded full-pill

- Border: accent colour

- Background: \#050815

- Font: Satoshi 10px

## **6. Right Column — Backtest Results**

### **6.1 Equity Curve**

Shows side-by-side equity curves:

- **Current Config** → Cyan line \#42E2F4

- **Suggested Config** → Green dashed line \#4BE8A3

### **A2 Chart Styling**

- Background: \#050814

- Gridlines: subtle (6% opacity)

- Line width: 1.6px

- No gradients

- No fills

- No glow

### **6.2 Metrics Grid**

Below the equity curve:

- Win Rate

- Profit Factor

- Max Drawdown

- Sharpe Ratio

Each shows:

OldValue → NewValue

Displayed using:

- Geist Mono

- Satoshi labels (10px)

### **6.3 Scenario Tests**

A structured block showing “stress test” outcomes.

Example rows:

- **TrendUp + High ATR** → PASS

- **TrendDn + High ATR** → WARN (drawdown spike)

- **Chop + Low ATR** → PASS

- **OR Break Fakeout** → FAIL

### **A2 Scenario Styling**

- PASS → green text

- WARN → amber

- FAIL → red

- Row border: dashed, subtle, muted

- Font: Satoshi 11px / Mono for status

## **7. Interaction & Behaviour**

### **Config Set Selection**

- Clicking on a config highlights it

- Middle panel updates immediately

### **Editing Parameters**

- Parameters may be adjusted inline (in real system)

- Suggested values shown but not applied until operator confirms

### **Backtest Rerun**

- Pressing "Preview Impact" triggers a temporary recompute

- Updates equity curve and scenario outcomes

### **Apply & Reset**

- Apply → commits active config

- Reset → restores last-saved config

### **Responsive Behaviour**

- Under ~1300px width:

  - Right column stacks below middle

  - Left stays top

- Cards and tables compress vertically but retain clarity

## **8. Typography (A2 Variant)**

| **Element**   | **Font**     | **Size** |
|---------------|--------------|----------|
| Labels        | Satoshi      | 10–11px  |
| Table Headers | Satoshi      | 11px     |
| Table Values  | Geist Mono   | 11–12px  |
| Buttons       | Satoshi      | 10px     |
| Scenario Rows | Satoshi/Mono | 11px     |
| Config Names  | Satoshi      | 12px     |

## **9. Colour Palette (A2 Variant)**

| **Element**       | **Colour / Token**     |
|-------------------|------------------------|
| Page Shell        | \#050814               |
| Panel Background  | \#080D1C               |
| Header Background | \#0B1222               |
| Accent Cyan       | \#42E2F4               |
| Numeric Green     | \#4BE8A3               |
| Amber             | \#FFC466               |
| Red               | \#FF6A6A               |
| Steel Blue        | rgba(149,161,220,0.9)  |
| Text Primary      | \#E8EDF9               |
| Text Secondary    | \#A1A9C3               |
| Text Muted        | \#6C7594               |
| Border Subtle     | rgba(255,255,255,0.07) |
| Table Row Border  | rgba(255,255,255,0.04) |

All backgrounds are **flat**, no gradients.

## **10. Example Parameter Row (Text Form)**

rrBandMin \| 1.3 → 1.6 \| Good (↑ WinRate in TrendUp)

maxContracts \| 2 → 1 \| Risk (↓ Drawdown in chop)

holdMinutes \| 12 → 9 \| Good (↑ Trend R, +Signals)

minScore \| 80 → 84 \| Good (Higher selectivity)

## **11. Summary**

The Strategy Lab Page under A2 styling is now:

- Modern

- Fintech-premium

- Dense and operator-focused

- Consistent with Worklist, Tickets, Markets, Analytics, and System

- Uses Satoshi + Geist Mono for perfect clarity

- Applies colour-coded impact chips

- Maintains all layout and content of your original document

- Uses flat charts (no gradients)

- Perfectly aligned with the environment defined in the code and mockups
