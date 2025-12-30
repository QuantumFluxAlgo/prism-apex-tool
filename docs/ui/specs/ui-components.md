# **PRISM APEX — REACT & TAILWIND COMPONENT STRUCTURES**

A2 Variant — Satoshi + Geist Mono · Deep Navy · Flat Charts

## **1. Objectives**

This document defines:

- The **React component hierarchy** for all main pages.

- The **shared layout and UI primitives**.

- How **A2 visual styling** (Satoshi + Geist Mono, deep navy, cyan
  accent, flat charts) is applied via Tailwind and CSS variables.

Scope:

- **App shell & navigation  **

- **Worklist / Tickets / Markets / Analytics / System / Strategy Lab**
  layout components

- **Shared components** (panels, tables, tags, charts, log viewer,
  config list, etc.)

No business logic is defined here — this is purely **UI structure and
styling**.

## **2. A2 Design Tokens & Tailwind Mapping**

We assume **global CSS variables** are configured (e.g. via :root or a
theme provider):

:root {

--bg-shell: \#050814;

--bg-panel: \#080d1c;

--bg-header: \#0b1222;

--bg-table: \#090f1c;

--border-subtle: rgba(255,255,255,0.07);

--border-strong: rgba(66,226,244,0.8);

--text-primary: \#e8edf9;

--text-secondary: \#a1a9c3;

--text-muted: \#6c7594;

--accent: \#42e2f4;

--accent-soft: rgba(66,226,244,0.16);

--risk-green: \#4be8a3;

--risk-amber: \#ffc466;

--risk-red: \#ff6a6a;

}

### **2.1 Tailwind Theme (Conceptual)**

Tailwind is extended to expose these tokens via semantic utilities,
e.g.:

- bg-shell → background-color: var(--bg-shell)

- bg-panel → background-color: var(--bg-panel)

- bg-header → background-color: var(--bg-header)

- border-subtle → border-color: var(--border-subtle)

- text-primary, text-secondary, text-muted

- text-accent, border-accent, bg-accent-soft

- pill-risk-green, pill-risk-amber, pill-risk-red (composed utilities)

Fonts:

- font-satoshi for general text.

- font-geist-mono for all numeric content.

## **3. Global App Shell & Routing**

### **3.1 AppShell**

Top-level layout for all pages.

**Responsibilities**

- Render **global chrome** (title, environment, variant pill).

- Render **top-level navigation** between pages.

- Provide **max-width container** and shell background.

**Structure (simplified JSX)**

export function AppShell({ children }: { children: React.ReactNode }) {

return (

\<div className="min-h-screen bg-shell font-satoshi text-primary"\>

\<div className="mx-auto my-6 max-w-\[1680px\] rounded-3xl border
border-accent/40
bg-\[radial-gradient(circle_at_0_0,rgba(66,226,244,0.18),transparent_55%),radial-gradient(circle_at_100%\_100%,rgba(157,92,255,0.25),transparent_55%),#02030a\]
p-5 shadow-\[0_24px_70px_rgba(0,0,0,0.9)\]"\>

\<AppHeader /\>

\<TopNav /\>

\<main className="mt-3"\>{children}\</main\>

\</div\>

\</div\>

);

}

### **3.2 AppHeader**

Displays product title + variant / environment.

function AppHeader() {

return (

\<header className="mb-3 flex flex-wrap items-center justify-between
gap-4"\>

\<div\>

\<h1 className="text-\[16px\] font-medium tracking-\[0.16em\]
text-text-secondary uppercase"\>

PRISM APEX — EXECUTION &amp; ANALYTICS

\</h1\>

\<p className="mt-1 text-\[11px\] text-text-muted"\>

Worklist · Tickets · Markets · Analytics · System · Strategy Lab

\</p\>

\</div\>

\<div className="flex flex-wrap items-center justify-end gap-4"\>

\<div className="inline-flex items-center gap-2 rounded-full border
border-accent bg-\[#050815\] px-3 py-1 text-\[10px\]
text-text-secondary"\>

\<span className="h-2 w-2 rounded-full bg-accent
shadow-\[0_0_14px_rgba(66,226,244,0.9)\]" /\>

\<span\>A2 Dark · Satoshi + Geist Mono · Flat charts\</span\>

\</div\>

\</div\>

\</header\>

);

}

### **3.3 TopNav**

Tabs for main pages.

type NavKey = "worklist" \| "tickets" \| "markets" \| "analytics" \|
"system" \| "lab";

export function TopNav() {

const \[active, setActive\] = useState\<NavKey\>("worklist");

const items: { key: NavKey; label: string }\[\] = \[

{ key: "worklist", label: "Worklist" },

{ key: "tickets", label: "Tickets" },

{ key: "markets", label: "Markets" },

{ key: "analytics", label: "Analytics" },

{ key: "system", label: "System" },

{ key: "lab", label: "Strategy Lab" },

\];

return (

\<nav className="inline-flex flex-wrap items-center gap-1 rounded-full
border border-border-strong bg-\[#050815\] px-1 py-1"\>

{items.map((item) =\> {

const isActive = item.key === active;

return (

\<button

key={item.key}

type="button"

className={\[

"rounded-full px-3 py-1 text-\[11px\] transition",

isActive

? "bg-\[#e9f8ff\] font-semibold text-\[#050815\]"

: "text-text-secondary hover:bg-\[rgba(40,53,96,0.95)\]
hover:text-text-primary",

\].join(" ")}

onClick={() =\> setActive(item.key)}

\>

{item.label}

\</button\>

);

})}

\</nav\>

);

}

Page routing (SPA-level) can wrap AppShell and conditionally render each
page based on active state or router.

## **4. Shared Layout Primitives**

These are used across **all pages**.

### **4.1 FilterBar**

Sticky filter bar at the top of each page.

export function FilterBar({ children }: { children: React.ReactNode }) {

return (

\<div className="sticky top-0 z-10 mb-2 flex flex-wrap gap-2 rounded-2xl
border-b border-accent/25 bg-\[#13161c\] px-2 py-2"\>

{children}

\</div\>

);

}

**Filter pill:**

export function FilterPill({ children }: { children: React.ReactNode })
{

return (

\<button

type="button"

className="inline-flex items-center gap-2 rounded-full border
border-\[rgba(124,144,214,0.9)\] bg-\[#0b0f1c\] px-3 py-1 text-\[11px\]
text-text-secondary"

\>

{children}

\</button\>

);

}

**Filter search:**

export function FilterSearch(props:
React.InputHTMLAttributes\<HTMLInputElement\>) {

return (

\<div className="inline-flex min-w-\[180px\] max-w-xs flex-1
items-center rounded-full border border-\[rgba(124,144,214,0.9)\]
bg-\[#080c1a\] px-2 py-1 text-\[11px\] text-text-secondary"\>

\<span className="mr-1 text-\[11px\] text-text-muted"\>🔍\</span\>

\<input

{...props}

className="flex-1 bg-transparent text-\[11px\] text-text-primary
outline-none placeholder:text-text-muted"

/\>

\</div\>

);

}

### **4.2 Panel & PanelHeader**

export function Panel({ children, className = "" }: { children:
React.ReactNode; className?: string }) {

return (

\<section

className={\[

"rounded-\[18px\] border border-subtle bg-bg-panel
shadow-\[0_18px_60px_rgba(0,0,0,0.9)\]",

className,

\].join(" ")}

\>

{children}

\</section\>

);

}

export function PanelHeader({

title,

subtitle,

}: {

title: string;

subtitle?: string;

}) {

return (

\<header className="flex items-center justify-between border-b
border-white/5 bg-bg-header px-3 py-2"\>

\<h2 className="text-\[11px\] font-medium tracking-\[0.13em\]
text-text-secondary uppercase"\>

{title}

\</h2\>

{subtitle ? \<span className="text-\[10px\]
text-text-muted"\>{subtitle}\</span\> : null}

\</header\>

);

}

export function PanelBody({ children, className = "" }: { children:
React.ReactNode; className?: string }) {

return \<div className={\["px-3 py-3", className\].join("
")}\>{children}\</div\>;

}

### **4.3 DetailSection**

Used in Worklist/Tickets/Lab detail panels.

export function DetailSection({

label,

children,

first,

}: {

label: string;

children: React.ReactNode;

first?: boolean;

}) {

return (

\<section

className={\[

"pt-2",

first ? "" : "mt-2 border-t border-dashed border-white/10",

\].join(" ")}

\>

\<div className="text-\[10px\] text-text-muted"\>{label}\</div\>

\<div className="mt-1 text-\[11px\]
text-text-secondary"\>{children}\</div\>

\</section\>

);

}

### **4.4 DataTable**

Generic table wrapper.

export function DataTable({

head,

children,

}: {

head: React.ReactNode;

children: React.ReactNode;

}) {

return (

\<div className="max-h-\[360px\] overflow-auto"\>

\<table className="w-full border-collapse text-\[11px\]"\>

\<thead className="bg-\[#131724\]"\>

{head}

\</thead\>

\<tbody\>{children}\</tbody\>

\</table\>

\</div\>

);

}

Example table row style:

export function DataRow({ children, selectable, active }: { children:
React.ReactNode; selectable?: boolean; active?: boolean }) {

return (

\<tr

className={\[

"bg-\[#080d1c\] text-text-secondary",

"even:bg-\[#090f1c\]",

"border-b border-white/5",

selectable

? "cursor-pointer transition hover:bg-\[#13172b\]
hover:shadow-\[0_0_0_1px_rgba(66,226,244,0.16)\]
hover:-translate-y-\[0.5px\]"

: "",

active ? "relative before:absolute before:left-0 before:top-0
before:h-full before:w-\[3px\] before:bg-accent" : "",

\].join(" ")}

\>

{children}

\</tr\>

);

}

## **5. Shared Tokens as Components**

### **5.1 RiskPill**

type Risk = "green" \| "amber" \| "red";

export function RiskPill({ risk }: { risk: Risk }) {

const base =

"inline-flex items-center justify-center rounded-full border px-2
py-\[2px\] text-\[10px\] font-geist-mono";

const map: Record\<Risk, string\> = {

green: "border-\[rgba(75,232,163,0.8)\] bg-\[rgba(75,232,163,0.12)\]
text-\[#c9ffe5\]",

amber: "border-\[rgba(255,196,102,0.9)\] bg-\[rgba(255,196,102,0.13)\]
text-\[#ffe6bf\]",

red: "border-\[rgba(255,106,106,0.9)\] bg-\[rgba(255,106,106,0.16)\]
text-\[#ffd1d1\]",

};

return \<span className={\`\${base}
\${map\[risk\]}\`}\>{risk.toUpperCase()}\</span\>;

}

### **5.2 Status Tag (Tickets)**

type TicketStatus = "Actioned" \| "Rejected" \| "Expired" \|
"Downranked";

export function StatusTag({ status }: { status: TicketStatus }) {

const base =

"inline-flex items-center rounded-full border px-2 py-\[2px\]
text-\[10px\]";

const cls: Record\<TicketStatus, string\> = {

Actioned: "border-\[rgba(75,232,163,0.9)\] text-\[#c9ffe5\]
bg-\[#050815\]",

Rejected: "border-\[rgba(255,106,106,0.9)\] text-\[#ffd1d1\]
bg-\[#050815\]",

Expired: "border-\[rgba(255,196,102,0.9)\] text-\[#ffe4b7\]
bg-\[#050815\]",

Downranked: "border-\[rgba(170,177,205,0.9)\] text-\[#c1c7dd\]
bg-\[#050815\]",

};

return \<span className={\`\${base}
\${cls\[status\]}\`}\>{status}\</span\>;

}

### **5.3 Strength Arrow**

type Trend = "up" \| "flat" \| "down";

export function StrengthArrow({ trend }: { trend: Trend }) {

const symbol = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";

const cls =

trend === "up"

? "text-\[var(--risk-green)\]"

: trend === "down"

? "text-\[var(--risk-red)\]"

: "text-text-muted";

return (

\<span className={\`font-geist-mono text-\[11px\] \${cls}\`}\>

{symbol}

\</span\>

);

}

### **5.4 Context Tags**

export function ContextTags({ tags }: { tags: string\[\] }) {

return (

\<div className="flex flex-wrap gap-\[4px\]"\>

{tags.map((tag) =\> (

\<span

key={tag}

className="rounded-full border border-\[rgba(117,137,210,0.9)\]
bg-\[#050815\] px-2 py-\[1px\] text-\[10px\] text-text-secondary"

\>

{tag}

\</span\>

))}

\</div\>

);

}

## **6. Page-Specific Structures**

### **6.1 Worklist Page**

**Component:** WorklistPage

**Layout:**

- \<FilterBar\> with Worklist-specific filters.

- Two-column layout (Worklist table left, Details panel right).

export function WorklistPage() {

return (

\<\>

\<FilterBar\>

\<FilterPill\>Symbol ▾\</FilterPill\>

\<FilterPill\>Strategy ▾\</FilterPill\>

\<FilterPill\>Score ≥ ▾\</FilterPill\>

\<FilterPill\>Risk: GREEN / AMBER\</FilterPill\>

\<FilterPill\>≤ 30m\</FilterPill\>

\<FilterPill\>Mute: ORR \| OSB \| VWFT\</FilterPill\>

\<FilterSearch placeholder="Search signals by symbol, strategy, notes…"
/\>

\</FilterBar\>

\<div className="grid grid-cols-\[minmax(0,3.1fr)\_minmax(0,2.1fr)\]
gap-3 max-\[1300px\]:grid-cols-1"\>

\<Panel\>

\<PanelHeader

title="Worklist · Tradeable Signals"

subtitle="Risk-filtered · ≤ 30m · One row per signal"

/\>

\<PanelBody\>

\<WorklistTable /\>

\</PanelBody\>

\</Panel\>

\<WorklistDetailsPanel /\>

\</div\>

\</\>

);

}

**WorklistTable** uses DataTable + DataRow, RiskPill, StrengthArrow,
ContextTags.

**WorklistDetailsPanel** uses Panel + DetailSection + grids for Trade
Block, Context, Score Breakdown, Config Snapshot, Notes.

### **6.2 Tickets Page**

**Component:** TicketsPage

Layout:

- \<FilterBar\> (Date, Symbol, Strategy, Status, Reason Category,
  Search).

- Main Panel with nested TicketsTable and TicketDetailsPanel.

Structure mirrors Worklist but with:

- StatusTag

- Ticket-specific context fields (Reason Category, Reason Summary).

### **6.3 Markets Page**

**Component:** MarketsPage

Layout:

- \<FilterBar\> (Symbol, Timeframe, Session, Overlays, Scrubber).

- Panel containing:

  - Left: MarketChartPanel (VWAP, OR, ATR, signals).

  - Right: ContextCardsPanel.

- Below: MiniSignalsPanel (table of last signals).

MarketChartPanel wraps an SVG-based chart with flat background, grid,
candles, overlays.

### **6.4 Analytics Page**

**Component:** AnalyticsPage

Layout:

- \<FilterBar\> (Date Range, Symbol, Strategy, Regime, Volatility,
  Search).

- Panel:

  - KpiRow (4 KPI cards).

  - Two-by-two grid of charts:

    - PnL vs Score

    - Win% by Regime

    - Score Drift

    - Config Impact

  - StrategyPerformanceTable.

KpiCard, ChartFrame, StrategyPerformanceTable reuse shared patterns.

### **6.5 System Page**

**Component:** SystemPage

Layout:

- Panel with:

  - Top: SystemHealthCardsRow.

  - Main: grid grid-cols-\[minmax(0,1.7fr)\_minmax(0,1.7fr)\]

    - Left: Symbol/Strategy Status table.

    - Right: LogViewer.

LogViewer uses LogFilterBar and a scrollable mono log list with coloured
lines.

### **6.6 Strategy Lab Page**

**Component:** StrategyLabPage

Layout:

- \<FilterBar\> (Strategy, Symbol, Config Set, Environment, State).

- Panel with three columns:

  - Left: ConfigListPanel.

  - Middle: ActiveConfigEditor.

  - Right: BacktestPanel (equity chart + metrics + scenarios).

ConfigList rows use active highlighting.  
ActiveConfigEditor uses table + impact chips.  
BacktestPanel uses ChartFrame and metric grid.

## **7. Log Viewer Structure**

**Component:** LogViewer

export function LogViewer() {

return (

\<Panel\>

\<PanelHeader

title="Log Viewer"

subtitle="Level · Component · Symbol · Strategy"

/\>

\<PanelBody\>

\<div className="mb-2 flex flex-wrap gap-2 text-\[10px\]"\>

\<FilterPill\>Level ▾\</FilterPill\>

\<FilterPill\>Component ▾\</FilterPill\>

\<FilterPill\>Symbol ▾\</FilterPill\>

\<FilterPill\>Strategy ▾\</FilterPill\>

\<FilterPill\>Pause ⏸\</FilterPill\>

\</div\>

\<div className="max-h-\[210px\] overflow-auto rounded-xl border
border-\[rgba(117,137,210,0.9)\] bg-\[#050815\] p-2 font-geist-mono
text-\[10px\]"\>

{/\* log lines rendered here \*/}

\</div\>

\</PanelBody\>

\</Panel\>

);

}

Log line colour classes:

- text-\[#9fe6c5\] for INFO

- text-\[#ffe6a6\] for WARN

- text-\[#ffb3b3\] for ERROR

## **8. Chart Frame**

**Component:** ChartFrame

Wraps any SVG chart.

export function ChartFrame({

title,

subtitle,

legend,

children,

}: {

title: string;

subtitle?: string;

legend?: React.ReactNode;

children: React.ReactNode;

}) {

return (

\<Panel\>

\<PanelHeader title={title} subtitle={subtitle} /\>

\<PanelBody\>

\<div className="rounded-\[18px\] border border-subtle bg-\[#050814\]"\>

\<div className="h-\[260px\]"\>

{children /\* SVG chart \*/}

\</div\>

{legend ? (

\<div className="flex items-center justify-between bg-\[#050815\] px-3
py-2 text-\[10px\] text-text-muted"\>

{legend}

\</div\>

) : null}

\</div\>

\</PanelBody\>

\</Panel\>

);

}

## **9. Summary**

- The above component structures **encode the A2 variant** visually and
  structurally.

- All pages share the same **shell, filter bar, panel, table, and tag
  primitives**.

- **Satoshi** is used for all text; **Geist Mono** for all numeric and
  log information.

- All charts are **flat, dark, operator-grade** with **no gradients**.

- Worklist, Tickets, Markets, Analytics, System, and Strategy Lab are
  all just **different compositions** of the same primitives.
