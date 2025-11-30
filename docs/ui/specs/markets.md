# **PRISM APEX — MARKETS PAGE (CONTEXT VIEWER)**

**A2 Variant — Satoshi + Geist Mono, Updated Colours & Visual Language**

## **1. Purpose of the Markets Page**

The Markets Page provides a **visual context view** for intraday
decision-making.  
It is *not* used for execution; it is for:

- Understanding current market structure

- Checking VWAP, Opening Range, ATR context

- Scrubbing through time

- Validating signal environmental fit

- Quickly correlating market regime with the Worklist and Tickets

This page enhances operator confidence by showing **what the market
looks like right now**, without distracting noise.

## **2. High-Level Layout Overview**

The page layout matches the structure defined in the original document,
now with A2 styling:

┌────────────────────────────────────────────────────────────────────────────┐

│ FILTER BAR (sticky) │

├────────────────────────────────────────────────────────────────────────────┤

│ ┌───────────────────────────────┐
┌─────────────────────────────────────┐ │

│ │ MAIN MARKET CHART │ │ CONTEXT CARDS PANEL │ │

│ │ (VWAP / OR / ATR / Signals) │ │ (Session Metrics / Regime / Vol) │ │

│ └───────────────────────────────┘
└─────────────────────────────────────┘ │

├────────────────────────────────────────────────────────────────────────────┤

│ MINI SIGNAL LOG (Market → Worklist → Tickets continuity) │

└────────────────────────────────────────────────────────────────────────────┘

## **3. Filter Bar (Sticky)**

Filters include:

- Symbol

- Timeframe

- Session

- Overlays

- Time Scrubber

### **A2 Styling**

- Background: \#13161C

- Bottom border: 1px cyan accent (#42E2F4 at ~20% opacity)

- Filter pills:

  - Dark navy fill \#0B0F1C

  - Border rgba(124,144,214,0.9)

  - Rounded full-pill shape

- Search and scrubber controls remain lightweight, operator-first

## **4. Main Market Chart**

This is the **core visual element**, displaying:

- **Candles** (synthetic or real)

- **VWAP  **

- **Opening Range (OR) High/Low  **

- **ATR bands  **

- **Signals** (small dots / markers at bar N)

- **Flat, dark background (no gradient)** per A2 rules

### **A2 Visual Rules for the Chart**

**Background:**

- Pure dark: \#050814

- No vertical gradients

- Subtle horizontal gridlines (rgba(255,255,255,0.06))

**Candles:**

- Bullish → A2 green \#4BE8A3

- Bearish → A2 red \#FF6A6A

- Wick opacity: 80–90%

**VWAP Line:**

- Cyan \#42E2F4

- 1.6px thickness

**Opening Range (OR):**

- Lines or shaded region

- Colour: A2 purple \#9B5CFF

**ATR Bands:**

- Amber \#FFC466

- Dashed (4 3)

- 1.1px stroke

**Signal Markers:**

- A2 green dots for entry direction

- Glow removed (A2 is subtle)

**Legend:**

- A2-styled pill-like legend with:

  - VWAP

  - OR

  - ATR Bands

  - Signals

- Text size: 10px Satoshi

- Icon dots styled with exact A2 colours

## **5. Context Cards Panel (Right Side)**

This block shows synthetic or live intraday metrics:

- Session Metrics

  - OR Width

  - VWAP Slope

  - VWAP Deviation

- Volatility & Regime

  - ATR

  - Volatility state (High / Medium / Low)

  - Regime (TrendUp, TrendDn, Chop…)

- Active Strategies

  - ORR

  - OSB

  - VWAP-FT

### **A2 Visual Style**

**Panel Background:**

- \#080D1C

**Card Background:**

- \#050815

**Card Border:**

- A2 steel-blue: rgba(125,146,222,0.9)

**Text:**

- Titles → Satoshi, 11px, \#E8EDF9

- Values → Geist Mono, 11px–12px

**Spacing:**

- 8px vertical between rows

- 12px padding per card

Cards must look like small, dense metrics surfaces — not like “dashboard
tiles.”

## **6. Mini Signal Log (Bottom Panel)**

Shows **recent signals**, tying Markets → Worklist → Tickets together.

Columns:

- Time

- Symbol

- Strategy

- Score

- Risk

- Context tags

### **A2 Style:**

- Same table style as Worklist/Tickets

- Risk colours: Green / Amber / Red

- Score & numeric → Geist Mono

- Context tags → A2 pills (#050815 background, steel-blue border)

## **7. Interactions & Behaviour**

### **Scrubber**

- Allows the operator to move back N bars in time

- Chart redraws instantly with updated OR/VWAP/ATR context

- Signal markers update according to the new time window

### **Live Mode**

- If at the right-most edge of scrubber, chart updates automatically

- If scrubber is dragged left, auto-update pauses

### **Hover**

- Candle hover shows:

  - OHLC

  - Time index

  - VWAP value

  - ATR at that candle

- Tooltip uses:

  - Dark A2 background \#050815

  - Cyan border

  - 10px mono font

### **Legend Toggle**

- Clicking a legend item toggles overlays

- Overlays fade in/out, not appear instantly

- All transitions \< 200ms (A2 spec)

## **8. Detailed Chart Requirements (A2-Compliant)**

### **Gridlines**

- Horizontal only

- Light opacity (6–7%)

- No vertical gridlines (keeps chart clean)

### **Candles**

- Height/width proportion identical to the mock

- Wick 1px

- Body 60–70% of candle slot width

### **VWAP**

- Smooth line

- No fill beneath

- Slight cyan glow removed → A2 is flat

### **ATR Bands**

- Two lines (upper, lower)

- Dashed, A2 amber

### **Signal Markers**

- Small circular markers

- Plotted at price location

- A2 green with slight opacity decrease (no glow)

## **9. Context Cards — Field Definitions**

### **Session Metrics**

- **OR Width (points or ticks)  **

- **VWAP Slope** (monotonic or smoothed derivative)

- **VWAP Deviation** (% deviation from VWAP)

### **Volatility & Regime**

- **ATR(14)  **

- **Volatility State** (Low, Mid, High)

- **Regime** (TrendUp / TrendDn / Chop)

### **Active Strategies**

- Boolean indicators for ORR / OSB / VWAP-FT

- Styled using:

  - Green = Enabled

  - Muted = Disabled

- Very small text, compact

## **10. Colour Palette — Markets Page (A2 Variant)**

| **Element**       | **Colour / Token**     |
|-------------------|------------------------|
| Page Shell        | \#050814               |
| Panel Background  | \#080D1C               |
| Chart Background  | \#050814 (flat)        |
| Legend Background | \#050815               |
| Border Subtle     | rgba(255,255,255,0.07) |
| Border Accent     | rgba(66,226,244,0.8)   |
| Accent Cyan       | \#42E2F4               |
| VWAP Line         | \#42E2F4               |
| OR Lines          | \#9B5CFF               |
| ATR Bands         | \#FFC466               |
| Signals           | \#4BE8A3               |
| Text Primary      | \#E8EDF9               |
| Text Secondary    | \#A1A9C3               |
| Text Muted        | \#6C7594               |

## **11. Typography Rules**

Main font: **Satoshi  **
Numeric font: **Geist Mono**

Sizes:

- Chart legend: 10px

- Context card titles: 11px

- Context card values: 11–12px

- Mini table: 11px

- Filters: 11px

## **12. Example (Textual Market Snapshot)**

Symbol: ES · 1m · Live

VWAP: 4520.3 (cyan line)

Opening Range: 4516.0 – 4524.5

ATR(14): 6.2 (High)

Regime: TrendUp

Signals: 3 detected (ORR, OSB, VWFT)

## **13. Summary**

The Markets Page is now fully aligned with:

- A2 design language

- Flat dark charts

- Fintech premium aesthetic

- High operator clarity

- Consistent visual theming with Worklist, Tickets, Analytics, System,
  and Strategy Lab
