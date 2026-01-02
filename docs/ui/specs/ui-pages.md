# **PRISM APEX — UI FOUNDATIONS / DESIGN SYSTEM (A2 VARIANT)**

**Satoshi + Geist Mono · Deep Navy A2 Palette · Flat Charts**

## **1. Core UI Principles**

The Prism Apex UI is designed to be:

1.  **Operator-first** — Every pixel optimised for speed and clarity.

2.  **Consistent** — Same visual system across all modules.

3.  **Data-forward** — Numbers dominate; opinionated structure, minimal
    chrome.

4.  **High-density** — No wasted space; actionable content takes
    priority.

5.  **Deterministic** — Tables, cards, metrics layouts stay predictable.

6.  **Flat, modern, fintech-grade** — No gradients, no decorative
    shadows.

7.  **Non-distracting** — Subtle interaction cues only.

A2 is the official visual direction for all surfaces.

## **2. Global Layout Structure**

All pages share the same top-level architecture:

┌────────────────────────────────────────────────┐

│ APP SHELL (title, environment, variant tag) │

├────────────────────────────────────────────────┤

│ TOP NAV (Worklist · Tickets · Markets · etc.) │

├────────────────────────────────────────────────┤

│ PAGE FILTER BAR (sticky) │

├────────────────────────────────────────────────┤

│ MAIN PAGE CONTENT │

└────────────────────────────────────────────────┘

This ensures:

- Navigation never moves

- Filters stay visible while scrolling tables

- User always knows the environment/symbol/strategy context

## **3. Typography**

### **Primary Font: Satoshi**

Used for:

- All labels

- Table headers

- Filters

- Card titles

- Interaction elements (buttons, pills)

Reasons:

- High readability at small sizes

- Modern fintech aesthetic

- Excellent weight consistency

### **Numeric Font: Geist Mono**

Used for:

- Prices

- Scores

- R:R

- ATR / VWAP metrics

- Win rates

- Equity curve labels

- Logs timestamp and metadata

- Sparkline glyphs

Reasons:

- Perfect for aligned numeric scanning

- Monospaced, compact, minimal noise

- Cohesive with trading systems

## **4. Colour System — A2 Tokens**

All UI uses the A2 palette:

### **Background Surfaces**

| **Token** | **Colour** | **Use Case**                |
|-----------|------------|-----------------------------|
| bg-shell  | \#050814   | Page shell, outer container |
| bg-panel  | \#080D1C   | All main panels             |
| bg-header | \#0B1222   | Panel headers               |
| bg-table  | \#090F1C   | Table rows                  |
| bg-deep   | \#050815   | Log viewer, config list     |

### **Text**

| **Token**      | **Colour** |
|----------------|------------|
| text-primary   | \#E8EDF9   |
| text-secondary | \#A1A9C3   |
| text-muted     | \#6C7594   |

### **Accents**

| **Element**      | **Colour**            |
|------------------|-----------------------|
| Accent (primary) | \#42E2F4              |
| Accent soft      | rgba(66,226,244,0.16) |
| Strategy purple  | \#9B5CFF              |
| Amber            | \#FFC466              |
| Red              | \#FF6A6A              |
| Green            | \#4BE8A3              |

### **Borders**

| **Element**       | **Colour**             |
|-------------------|------------------------|
| Subtle border     | rgba(255,255,255,0.07) |
| Accent border     | rgba(66,226,244,0.8)   |
| Steel-blue border | rgba(125,146,222,0.9)  |

## **5. Components**

All pages use the same component library principles.

### **5.1 Panels**

- Background: bg-panel

- Border: border-subtle

- Radius: 18px

- Shadow: soft, high-falloff (no neon)

### **5.2 Panel Headers**

- Background: bg-header

- Font: Satoshi, 11–12px

- Colour: text-secondary

- Border bottom: subtle

### **5.3 Filter Pills**

- Background: \#0B0F1C

- Border: steel-blue

- Height: compact

- Radius: full-pill

- Font: Satoshi 10–11px

### **5.4 Search Inputs**

- Full-pill radius

- Cyan border on focus

- Background: \#080C1A

- Placeholder: text-muted

### **5.5 Tables**

#### **Header Row**

- Background: \#131724

- Bold Satoshi

- Sticky

#### **Body Rows**

- Alternating rows: \#080D1C / \#090F1C

- Hover:

  - highlight with A2 cyan stroke

  - subtle brightness lift

#### **Numeric Columns**

- Geist Mono

- Right-aligned for legibility

### **5.6 Tags & Pills**

Used in:

- Worklist

- Tickets

- Markets

- Strategy Lab

- Analytics

**Risk pills:**

- GREEN / AMBER / RED

- Flat colours, monospaced letters, rounded

**Context pills:**

- Navy background

- Steel-blue border

- Satoshi 10px

### **5.7 Charts**

All charts share:

- Flat background

- Horizontal gridlines only

- Bright accent lines (cyan, purple, amber, green)

- Square, crisp, no glow

- Geist Mono for labels

Chart types implemented:

- Candles

- VWAP line

- ATR bands

- OR high/low

- Drift lines

- Equity curves

- Regime bar charts

- Score & PnL overlays

### **5.8 Buttons**

Shapes:

- Full pill

- Thin border (A2 cyan, green, or steel-blue)

Fonts:

- Satoshi 10–11px

Colours:

- Neutral: \#050815

- Primary outlines: cyan

- Success: green

- Reset: steel-blue

## **6. Page Shell / Navigation**

### **6.1 Shell**

- Max width: ~1680px

- Margins: 24–36px

- Background: panel gradient at low opacity (A2 specific)

- Title block:

  - Uppercase

  - Letter-spacing 0.14–0.16em

  - Satoshi

### **6.2 Navigation Bar**

- Full-pill container

- Buttons styled as soft pills

- Active tab:

  - White-on-blue

  - Strong contrast

- Inactive:

  - Muted text

  - Dark pill background

### **6.3 Environment / Variant Tags**

- Rounded pill

- A2 cyan border

- “A2 Dark · Satoshi + Geist Mono · Flat Charts”

## **7. Accessibility**

- All text \>= 10px

- High contrast ratios

- Numeric alignment optimised for fast scanning

- Colour-coded semantics:

  - Green = good / positive execution

  - Amber = caution

  - Red = denial or risk action

## **8. Interaction Model**

### **Hover**

- Subtle elevation

- Soft outline

- No glow

### **Active**

- Cyan accent on left bar for table rows

- Selected config row (Strategy Lab)

- Tabs in nav bar

### **Scrolling**

- Sticky headers for tables

- Sticky filter bars on all pages

- Scroll areas capped to preserve layout

### **Click Action Targets**

Consistent across Worklist, Tickets, Markets, Analytics, System, Lab.

## **9. Motion**

- All transitions capped at 120–150ms

- No easing ramps or decorative animations

- Use quick fades and single-step transforms only

## **10. Component Consistency Across All Pages**

The following components are shared across Worklist, Tickets, Markets,
Analytics, System, and Strategy Lab:

- Filter bar

- Tag & pill system

- Table architecture

- Panel/PanelHeader

- Charts: flat SVG with A2 colours

- Shell header

- Navigation bar

- Section headers

- Right-side details panels

- Config lists (vertical nav style)

This ensures:

- Minimal cognitive switching

- Ultra-fast operator scanning

- Zero ambiguity in interaction semantics

## **11. Summary**

The A2 UI Design System:

- Establishes a consistent, modern, fintech-grade visual language

- Uses Satoshi + Geist Mono for maximum clarity

- Applies deep navy surfaces with cyan accent

- Removes all gradients and flashy shadows

- Provides a high-density operator-friendly layout

- Keeps your original layout and structure untouched

This document is now the **true source of UI language** for Prism Apex.
