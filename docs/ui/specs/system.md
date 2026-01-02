# **PRISM APEX — SYSTEM PAGE (HEALTH, STATUS & LOGS)**

**A2 Variant — Satoshi + Geist Mono, Updated Colours & Visual Language**

## **1. Purpose of the System Page**

The System Page provides a **top-down operational health view** of the
entire Prism Apex environment.  
It enables the operator to quickly validate:

- Data ingestion integrity

- Worker & job health

- Execution engine readiness

- Risk layer compliance

- Live UI/WebSocket connectivity

- Log stream diagnostics

This page is an **operational control surface**, not a trading
interface.

It ensures the system is functioning, up to date, in sync, and safe for
the operator to rely on.

## **2. Layout Overview**

The System Page consists of:

1.  **System Health Cards  **

2.  **Symbol/Strategy Status Table  **

3.  **Live Log Stream Viewer  **

ASCII representation:

┌────────────────────────────────────────────────────────────────────────────┐

│ SYSTEM HEALTH (4 cards) │

├────────────────────────────────────────────────────────────────────────────┤

│ SYMBOL/STRATEGY STATUS TABLE \| LOG VIEWER │

└────────────────────────────────────────────────────────────────────────────┘

Everything is aligned to the A2 design language:

- Deep navy surfaces

- Cyan accents

- Flat cards

- Geist Mono numeric labels

- Satoshi for headings and metadata

## **3. System Health (Top Cards)**

A grid of small, dense cards summarising:

- **Data Ingest Health  **

- **Tickets API Health  **

- **Risk Layer  **

- **UI/Dashboard Connection  **

### **A2 Card Styling**

- Background: \#050815

- Border: 1px solid rgba(125,146,222,0.9)

- Text Primary: \#E8EDF9

- Text Secondary: \#A1A9C3

- Font:

  - Satoshi 11px for labels

  - Geist Mono 11px for values

### **Example Content (as in your original doc)**

**Data Ingest**

- Yahoo bars: OK (lag: 15s)

- Session metrics: OK

- Gap-fill worker: OK

**Tickets API**

- Latency (p95): 48ms

- 5xx last 10m: 0

- Queue depth: 2

**Risk Layer**

- Max Contracts: 2

- Consecutive losses: 1/3

- Daily R limit: 0.7/3.0

**UI/Dashboard**

- WebSocket: Connected

- Last update timestamp

- Build version

## **4. Symbol/Strategy Status Table**

A scrollable table showing health for:

- Each symbol (ES, NQ, CL, YM, etc.)

- Each strategy (ORR, OSB, VWAP-FT)

### **Columns**

- Symbol

- Strategy

- Status (Healthy / Degraded)

- Lag

- Errors

- Notes

### **A2 Table Styling**

- Background rows:

  - \#080D1C

  - \#090F1C (alternating)

- Header background: \#131724

- Borders: rgba(255,255,255,0.04)

- Hover:

  - Slight brightness lift

  - A2 cyan outline

- Font:

  - Column titles → Satoshi

  - Values (lag/errors) → Geist Mono

### **Status Logic (display only)**

**Healthy**

- Lag ≤ 5s

- Errors = 0

**Degraded**

- Lag \> 5s

- OR Errors \> 0

### **Notes**

Short text summarising recent anomalies, e.g.:

- “OK”

- “Lagging bars”

- “Recent error spike”

## **5. Log Viewer (Right Panel)**

The Log Viewer displays a live stream of system logs, filtered and
colour-coded.

### **Filter Controls**

- Level (INFO/WARN/ERROR)

- Component

- Symbol

- Strategy

- Pause Scroll

### **A2 Styling**

- Background: \#050815

- Border: 1px solid rgba(117,137,210,0.9)

- Rounded corners: 12px

- Scrollable, with A2 track style

- Font: **Geist Mono 10px  **

### **Log Line Colours**

- INFO → A2 green-tinted (#9FE6C5)

- WARN → A2 amber (#FFE6A6)

- ERROR → A2 red (#FFB3B3)

### **Log Format**

\[HH:MM:SS\] LEVEL component:name · message text

### **Behaviour**

- Scroll locked unless pause is disabled

- New logs append at bottom

- Filtering is instantaneous (client-side)

## **6. Interactivity & Behaviour**

### **Cards**

- No hover effects

- Click disabled (informational only)

### **Status Table**

- Row hover → subtle lift + cyan glow

- Sticky header

- Scrollable region ~260–360px height

### **Log Viewer**

- Supports auto-scroll & pause

- Shows approx. 200 recent lines (configurable)

- Colour-coded alerts

- Filters snap to active state

## **7. Typography (A2 Variant)**

- **Satoshi** → headers, labels, categories

- **Geist Mono** → time, lag, numeric values, log timestamps

- Size ranges:

  - Headers: 12–14px

  - Card values: 11px

  - Table body: 11–12px

  - Log viewer: 10px

## **8. Colour Palette (A2 Variant)**

| **Element**       | **Colour / Token**     |
|-------------------|------------------------|
| Page Shell        | \#050814               |
| Panel Background  | \#080D1C               |
| Card Background   | \#050815               |
| Accent Cyan       | \#42E2F4               |
| Steel Blue Border | rgba(125,146,222,0.9)  |
| Text Primary      | \#E8EDF9               |
| Text Secondary    | \#A1A9C3               |
| Text Muted        | \#6C7594               |
| Green (positive)  | \#4BE8A3               |
| Amber             | \#FFC466               |
| Red               | \#FF6A6A               |
| Error Log Red     | \#FFB3B3               |
| Warn Log Amber    | \#FFE6A6               |
| Info Log Green    | \#9FE6C5               |
| Subtle Border     | rgba(255,255,255,0.07) |
| Table Row Border  | rgba(255,255,255,0.04) |

## **9. Example Log Output (Text Form)**

\[09:48:12\] INFO ingest:yahoo · Bars upserted for ES 2024-10-30 09:35

\[09:48:13\] INFO metrics:session · SessionMetrics recomputed ES
2024-10-30

\[09:48:15\] WARN risk:apex · Consecutive losses 2/3 reached for ES ORR

\[09:48:17\] INFO tickets · Ticket TK-ES-07 actioned (2 contracts)

\[09:48:19\] ERROR ingest:yahoo · Temporary HTTP 429 · backing off

\[09:48:22\] INFO ingest:yahoo · Recovered after HTTP 429

## **10. Full A2 System Page Summary**

The System Page under the A2 design system now:

- Uses deep fintech styling

- Maintains operational density

- Improves readability with Satoshi + Geist Mono

- Redesigned cards match the rest of your app

- Table + logs use consistent A2 accenting

- Flat panels, no gradients

- High clarity for operational diagnosis

This is a **pixel-aligned** rewrite matching your documents with
improved UX, no structural drift.
