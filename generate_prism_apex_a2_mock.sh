#!/usr/bin/env bash
set -euo pipefail

############################################
# index.html
############################################
cat > index.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Prism Apex — A2 Full Mock</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg-shell: #050814;
      --bg-panel: #080d1c;
      --bg-header: #0b1222;
      --bg-table: #090f1c;

      --border-subtle: rgba(255,255,255,0.07);
      --border-strong: rgba(145,167,255,0.8);

      --text: #e8edf9;
      --text-secondary: #a1a9c3;
      --text-muted: #6c7594;

      --accent: #42e2f4;
      --accent-soft: rgba(66,226,244,0.16);

      --risk-green: #4be8a3;
      --risk-amber: #ffc466;
      --risk-red: #ff6a6a;

      --chart-bg: #050814;
      --equity-bg: #050814;

      --log-bg: #050815;

      --shadow-soft: 0 24px 70px rgba(0,0,0,0.9);
      --radius-lg: 18px;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
    }

    body {
      min-height: 100vh;
      font-family: "Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at 0% 0%, rgba(66,226,244,0.18), transparent 55%),
        radial-gradient(circle at 100% 100%, rgba(157,92,255,0.25), transparent 55%),
        #02030a;
    }

    .mono {
      font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    .shell {
      max-width: 1680px;
      margin: 24px auto 36px;
      padding: 20px 26px 28px;
      border-radius: 24px;
      background: linear-gradient(140deg, rgba(5,9,24,0.98), rgba(2,4,12,0.98));
      border: 1px solid rgba(130,154,255,0.4);
      box-shadow: var(--shadow-soft);
    }

    header.app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }

    .app-title h1 {
      margin: 0 0 4px;
      font-size: 16px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .app-title p {
      margin: 0;
      font-size: 11px;
      color: var(--text-muted);
    }

    .variant {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #050815;
      border: 1px solid rgba(66,226,244,0.6);
      font-size: 10px;
      color: var(--text-secondary);
    }

    .variant-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 14px rgba(66,226,244,0.9);
    }

    .top-nav {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      padding: 3px;
      border-radius: 999px;
      background: #050815;
      border: 1px solid var(--border-strong);
      gap: 3px;
    }

    .top-nav button {
      border: none;
      outline: none;
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 11px;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      white-space: nowrap;
      transition: background 150ms ease, color 150ms ease, transform 80ms ease;
    }

    .top-nav button.active {
      background: #e9f8ff;
      color: #050815;
      font-weight: 600;
    }

    .top-nav button:not(.active):hover {
      background: rgba(40,53,96,0.95);
      color: var(--text);
      transform: translateY(-0.5px);
    }

    main {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .filter-bar {
      position: sticky;
      top: 0;
      z-index: 5;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 10px;
      margin-bottom: 8px;
      background: #13161c;
      border-bottom: 1px solid rgba(66,226,244,0.2);
      border-radius: 14px 14px 10px 10px;
    }

    .filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #0b0f1c;
      border: 1px solid rgba(124,144,214,0.9);
      font-size: 11px;
      color: var(--text-secondary);
    }

    .filter-search {
      flex: 1;
      min-width: 180px;
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid rgba(124,144,214,0.9);
      background: #080c1a;
      color: var(--text-secondary);
    }

    .filter-search input {
      border: none;
      outline: none;
      background: transparent;
      color: var(--text);
      font-size: 11px;
      flex: 1;
      padding-left: 4px;
    }

    .filter-search input::placeholder {
      color: var(--text-muted);
    }

    .panel {
      border-radius: var(--radius-lg);
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      box-shadow: 0 18px 60px rgba(0,0,0,0.9);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      background: var(--bg-header);
    }

    .panel-header h2 {
      margin: 0;
      font-size: 11px;
      letter-spacing: 0.13em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .panel-header span {
      font-size: 10px;
      color: var(--text-muted);
    }

    .panel-body {
      padding: 10px 12px 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    thead {
      background: #131724;
    }

    thead th {
      padding: 6px 6px;
      text-align: left;
      font-weight: 500;
      color: var(--text-secondary);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      white-space: nowrap;
    }

    tbody tr {
      background: var(--bg-table);
      border-bottom: 1px solid rgba(255,255,255,0.04);
      transition: background 120ms ease, box-shadow 120ms ease, transform 70ms ease;
    }

    tbody tr:nth-child(2n) { background: #090d19; }

    tbody tr:hover {
      background: #13172b;
      box-shadow: 0 0 0 1px var(--accent-soft);
      transform: translateY(-0.2px);
    }

    tbody td {
      padding: 5px 6px;
      vertical-align: middle;
      color: var(--text-secondary);
    }

    tbody td.num {
      text-align: right;
      color: var(--text);
    }

    tbody td.num.mono { font-family: "Geist Mono", ui-monospace, monospace; }

    .risk-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-family: "Geist Mono", ui-monospace, monospace;
    }

    .risk-green {
      background: rgba(75,232,163,0.12);
      border: 1px solid rgba(75,232,163,0.8);
      color: #c9ffe5;
    }

    .risk-amber {
      background: rgba(255,196,102,0.13);
      border: 1px solid rgba(255,196,102,0.9);
      color: #ffe6bf;
    }

    .risk-red {
      background: rgba(255,106,106,0.16);
      border: 1px solid rgba(255,106,106,0.9);
      color: #ffd1d1;
    }

    .status-tag {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      border: 1px solid rgba(255,255,255,0.18);
      background: #050815;
    }

    .status-actioned {
      border-color: rgba(75,232,163,0.9);
      color: #c9ffe5;
    }

    .status-rejected {
      border-color: rgba(255,106,106,0.9);
      color: #ffd1d1;
    }

    .status-expired {
      border-color: rgba(255,196,102,0.9);
      color: #ffe4b7;
    }

    .status-downrank {
      border-color: rgba(170,177,205,0.9);
      color: #c1c7dd;
    }

    .strength {
      font-family: "Geist Mono", ui-monospace, monospace;
      font-size: 11px;
    }

    .strength-up { color: var(--risk-green); }
    .strength-flat { color: var(--text-muted); }
    .strength-down { color: var(--risk-red); }

    .trend-arrow { font-size: 11px; }
    .trend-up { color: var(--risk-green); }
    .trend-sideways { color: var(--text-muted); }
    .trend-down { color: var(--risk-red); }

    .spark {
      font-family: "Geist Mono", ui-monospace, monospace;
      font-size: 11px;
      letter-spacing: 0.08em;
    }

    .spark-green { color: var(--risk-green); }
    .spark-amber { color: var(--risk-amber); }
    .spark-red { color: var(--risk-red); }

    .ctx-tags {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .ctx-pill {
      border-radius: 999px;
      border: 1px solid rgba(117,137,210,0.9);
      padding: 1px 6px;
      font-size: 10px;
      color: var(--text-secondary);
      background: #050815;
    }

    .layout-two {
      display: grid;
      grid-template-columns: minmax(0, 3.1fr) minmax(0, 2.1fr);
      gap: 14px;
    }

    .layout-two-wide {
      display: grid;
      grid-template-columns: minmax(0,1.6fr) minmax(0,1.6fr);
      gap: 14px;
    }

    .layout-three-lab {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 2.2fr) minmax(0, 1.7fr);
      gap: 14px;
    }

    .market-layout {
      display: grid;
      grid-template-columns: minmax(0, 3.4fr) minmax(0, 1.9fr);
      gap: 16px;
    }

    .scroll-y {
      max-height: 360px;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .scroll-y::-webkit-scrollbar { width: 6px; }
    .scroll-y::-webkit-scrollbar-thumb {
      background: rgba(118,138,210,0.9);
      border-radius: 999px;
    }

    .details-panel {
      border-radius: var(--radius-lg);
      background: rgba(7,10,26,0.98);
      border: 1px solid rgba(66,226,244,0.35);
      box-shadow: 0 18px 60px rgba(0,0,0,0.9);
    }

    .details-header {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      background: #0b1222;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 10px;
      align-items: center;
    }

    .details-header h3 {
      margin: 0;
      font-size: 12px;
      color: var(--text);
    }

    .details-meta {
      font-size: 10px;
      color: var(--text-secondary);
    }

    .details-body {
      padding: 10px 12px 12px;
      font-size: 11px;
      color: var(--text-secondary);
    }

    .details-section {
      padding-top: 8px;
      margin-top: 8px;
      border-top: 1px dashed rgba(255,255,255,0.08);
    }

    .details-section:first-of-type {
      border-top: none;
      margin-top: 0;
      padding-top: 0;
    }

    .details-label {
      font-size: 10px;
      color: var(--text-muted);
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 12px;
      margin-top: 4px;
    }

    .chart-shell {
      border-radius: var(--radius-lg);
      background: var(--chart-bg);
      border: 1px solid var(--border-subtle);
      box-shadow: 0 18px 60px rgba(0,0,0,0.9);
      overflow: hidden;
    }

    .chart-main {
      height: 260px;
      background: var(--chart-bg);
      position: relative;
    }

    .chart-main svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .chart-legend {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px 8px;
      font-size: 10px;
      background: #050815;
    }

    .legend-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--text-secondary);
    }

    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--accent);
    }

    .legend-dot.or { background: #9b5cff; }
    .legend-dot.atr { background: #ffc466; }
    .legend-dot.signal { background: #4be8a3; }

    .equity-shell {
      height: 150px;
      border-radius: 12px;
      background: var(--equity-bg);
      border: 1px solid rgba(255,255,255,0.12);
      overflow: hidden;
      margin-bottom: 8px;
    }

    .equity-shell svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .kpi-card {
      border-radius: 14px;
      padding: 8px 10px;
      background: rgba(6,10,26,0.96);
      border: 1px solid rgba(125,146,222,0.9);
      box-shadow: 0 18px 50px rgba(0,0,0,0.85);
      font-size: 11px;
    }

    .kpi-label { color: var(--text-muted); margin-bottom: 3px; }
    .kpi-value { font-family: "Geist Mono", ui-monospace, monospace; font-size: 13px; color: var(--text); }
    .kpi-delta.good { color: var(--risk-green); font-size: 11px; }
    .kpi-delta.bad { color: var(--risk-red); font-size: 11px; }

    .health-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .health-card {
      border-radius: 14px;
      padding: 8px 10px;
      background: #050815;
      border: 1px solid rgba(125,146,222,0.9);
      font-size: 11px;
    }

    .health-title {
      font-size: 11px;
      color: var(--text);
      margin-bottom: 4px;
    }

    .health-line {
      font-size: 10px;
      color: var(--text-secondary);
    }

    .log-stream {
      max-height: 210px;
      overflow-y: auto;
      font-size: 10px;
      font-family: "Geist Mono", ui-monospace, monospace;
      background: var(--log-bg);
      border-radius: 12px;
      border: 1px solid rgba(117,137,210,0.9);
      padding: 6px 8px;
    }

    .log-line.ok { color: #9fe6c5; }
    .log-line.warn { color: #ffe6a6; }
    .log-line.error { color: #ffb3b3; }

    .log-filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 10px;
    }

    .log-filter-pill {
      border-radius: 999px;
      padding: 2px 8px;
      border: 1px solid rgba(117,137,210,0.9);
      background: #050815;
      color: var(--text-secondary);
    }

    .config-list {
      max-height: 340px;
      overflow-y: auto;
      padding-right: 2px;
    }

    .config-row {
      border-radius: 10px;
      padding: 6px 8px;
      margin-bottom: 4px;
      background: #090f22;
      border: 1px solid rgba(117,137,210,0.9);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      cursor: pointer;
    }

    .config-row span.name { color: var(--text); }
    .config-row span.meta { font-size: 10px; color: var(--text-muted); }

    .config-row.active {
      background: #0a122b;
      box-shadow: 0 0 0 1px var(--accent-soft), 0 16px 40px rgba(0,0,0,0.9);
    }

    .suggestion-pill {
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10px;
      background: rgba(255,196,102,0.12);
      border: 1px solid rgba(255,196,102,0.9);
      color: #ffe6bf;
    }

    .impact-chip {
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10px;
      border: 1px solid rgba(149,161,220,0.9);
      background: #050815;
      color: var(--text-secondary);
    }

    .impact-chip.good {
      border-color: rgba(75,232,163,0.9);
      color: #c9ffe5;
    }

    .impact-chip.risk {
      border-color: rgba(255,196,102,0.9);
      color: #ffe6bf;
    }

    .lab-param-table {
      max-height: 340px;
      overflow-y: auto;
    }

    .lab-param-table thead th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #131724;
    }

    .scenario-list {
      font-size: 11px;
    }

    .scenario-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px dashed rgba(255,255,255,0.06);
    }

    .scenario-label { color: var(--text-secondary); }
    .scenario-status {
      font-size: 10px;
      font-family: "Geist Mono", ui-monospace, monospace;
    }
    .scenario-pass { color: var(--risk-green); }
    .scenario-warn { color: var(--risk-amber); }
    .scenario-fail { color: var(--risk-red); }

    .hidden { display: none; }

    @media (max-width: 1300px) {
      .shell { margin: 16px; padding: 16px; }
      .layout-two, .layout-two-wide, .market-layout, .layout-three-lab {
        grid-template-columns: minmax(0, 1fr);
      }
      .kpi-row, .health-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .scroll-y { max-height: 260px; }
    }

    @media (max-width: 860px) {
      .kpi-row, .health-row { grid-template-columns: minmax(0, 1fr); }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="app-header">
      <div class="app-title">
        <h1>PRISM APEX — EXECUTION & ANALYTICS</h1>
        <p>Worklist · Tickets · Markets · Analytics · System · Strategy Lab</p>
      </div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:flex-end;">
        <div class="variant">
          <span class="variant-dot"></span>
          <span>A2 Dark · Satoshi + Geist Mono · Flat charts</span>
        </div>
        <nav class="top-nav">
          <button id="nav-worklist" class="active">Worklist</button>
          <button id="nav-tickets">Tickets</button>
          <button id="nav-markets">Markets</button>
          <button id="nav-analytics">Analytics</button>
          <button id="nav-system">System</button>
          <button id="nav-lab">Strategy Lab</button>
        </nav>
      </div>
    </header>

    <main>
      <!-- WORKLIST -->
      <section id="view-worklist">
        <div class="filter-bar">
          <div class="filter-pill">Symbol ▾</div>
          <div class="filter-pill">Strategy ▾</div>
          <div class="filter-pill">Score ≥ ▾</div>
          <div class="filter-pill">Risk: GREEN / AMBER</div>
          <div class="filter-pill">≤ 30m</div>
          <div class="filter-pill">Mute: ORR | OSB | VWFT</div>
          <div class="filter-search">
            <span style="font-size:11px;color:var(--text-muted);">🔍</span>
            <input placeholder="Search signals by symbol, strategy, notes…" />
          </div>
        </div>

        <div class="layout-two">
          <div class="panel">
            <div class="panel-header">
              <h2>Worklist · Tradeable Signals</h2>
              <span>Risk-filtered · ≤ 30m · One row per signal</span>
            </div>
            <div class="panel-body scroll-y" id="worklist-table"></div>
          </div>

          <div class="details-panel" id="worklist-details">
            <div class="details-header">
              <h3>Signal Details</h3>
              <span class="details-meta" id="worklist-details-meta">Select a row to inspect full trade block.</span>
            </div>
            <div class="details-body">
              <div class="details-section">
                <div class="details-label">Header</div>
                <div id="wl-header-main" style="margin-top:4px;">—</div>
              </div>
              <div class="details-section">
                <div class="details-label">Trade Block</div>
                <div class="details-grid" id="wl-trade-grid"></div>
              </div>
              <div class="details-section">
                <div class="details-label">Market Context</div>
                <div class="details-grid" id="wl-context-grid"></div>
              </div>
              <div class="details-section">
                <div class="details-label">Score Breakdown</div>
                <div id="wl-score-line" style="margin-top:4px;">—</div>
              </div>
              <div class="details-section">
                <div class="details-label">Config Snapshot</div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
                  <span id="wl-config-text">—</span>
                  <button style="font-size:10px;border-radius:999px;border:1px solid var(--border-strong);background:#050815;color:var(--text-secondary);padding:3px 8px;cursor:pointer;">Open in Strategy Lab</button>
                </div>
              </div>
              <div class="details-section">
                <div class="details-label">Notes</div>
                <textarea style="margin-top:4px;width:100%;min-height:72px;border-radius:10px;border:1px solid rgba(117,137,210,0.9);background:#050815;color:var(--text);font-size:11px;padding:6px;font-family:'Satoshi',system-ui,sans-serif;" placeholder="Operator notes (mock, not persisted)…"></textarea>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- TICKETS -->
      <section id="view-tickets" class="hidden">
        <div class="filter-bar">
          <div class="filter-pill">Date ▾</div>
          <div class="filter-pill">Symbol ▾</div>
          <div class="filter-pill">Strategy ▾</div>
          <div class="filter-pill">Status ▾</div>
          <div class="filter-pill">Reason Category ▾</div>
          <div class="filter-search">
            <span style="font-size:11px;color:var(--text-muted);">🔍</span>
            <input placeholder="Search tickets by ID, reason, or notes…" />
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h2>Tickets · Historical Audit</h2>
            <span>Actioned · Rejected · Expired · Downranked</span>
          </div>
          <div class="panel-body">
            <div class="panel" style="margin-bottom:10px;">
              <div class="panel-body scroll-y" id="tickets-table"></div>
            </div>

            <div class="details-panel">
              <div class="details-header">
                <h3>Ticket Drilldown</h3>
                <span class="details-meta" id="tk-meta">Select any ticket row.</span>
              </div>
              <div class="details-body">
                <div class="details-section">
                  <div class="details-label">Header</div>
                  <div id="tk-header-main" style="margin-top:4px;">—</div>
                </div>
                <div class="details-section">
                  <div class="details-label">Trade Data</div>
                  <div class="details-grid" id="tk-trade-grid"></div>
                </div>
                <div class="details-section">
                  <div class="details-label">Score Breakdown</div>
                  <div id="tk-score-line" style="margin-top:4px;">—</div>
                </div>
                <div class="details-section">
                  <div class="details-label">Context</div>
                  <div class="details-grid" id="tk-context-grid"></div>
                </div>
                <div class="details-section">
                  <div class="details-label">Config Snapshot</div>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
                    <span id="tk-config-text">—</span>
                    <button style="font-size:10px;border-radius:999px;border:1px solid var(--border-strong);background:#050815;color:var(--text-secondary);padding:3px 8px;cursor:pointer;">Open in Strategy Lab</button>
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label">Notes</div>
                  <textarea style="margin-top:4px;width:100%;min-height:72px;border-radius:10px;border:1px solid rgba(117,137,210,0.9);background:#050815;color:var(--text);font-size:11px;padding:6px;font-family:'Satoshi',system-ui,sans-serif;" placeholder="Ticket notes (mock)…"></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- MARKETS -->
      <section id="view-markets" class="hidden">
        <div class="filter-bar">
          <div class="filter-pill">Symbol ▾</div>
          <div class="filter-pill">Timeframe ▾</div>
          <div class="filter-pill">Session ▾</div>
          <div class="filter-pill">Overlays ▾</div>
          <div class="filter-pill">Scrubber ◀──▶</div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h2>Market Context · VWAP / OR / ATR & Signals</h2>
            <span>Visual validation only · Non-execution</span>
          </div>
          <div class="panel-body">
            <div class="market-layout">
              <div class="chart-shell">
                <div class="chart-main">
                  <svg id="market-chart"></svg>
                </div>
                <div class="chart-legend">
                  <div class="legend-row">
                    <span class="legend-item"><span class="legend-dot"></span>VWAP</span>
                    <span class="legend-item"><span class="legend-dot or"></span>Opening Range</span>
                    <span class="legend-item"><span class="legend-dot atr"></span>ATR Bands</span>
                    <span class="legend-item"><span class="legend-dot signal"></span>Signals</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);">ES · 1m · Synthetic session · Flat dark chart</div>
                </div>
              </div>

              <div class="panel">
                <div class="panel-header">
                  <h2>Context Cards</h2>
                  <span>Session metrics · Regime · Active strategies</span>
                </div>
                <div class="panel-body">
                  <div class="health-row" style="grid-template-columns: repeat(1, minmax(0, 1fr)); gap:8px;">
                    <div class="health-card">
                      <div class="health-title">Session Metrics</div>
                      <div class="health-line">OR Width: <span class="mono">12.5</span></div>
                      <div class="health-line">VWAP Slope: <span class="mono">+0.32</span></div>
                      <div class="health-line">VWAP Dev: <span class="mono">+0.24%</span></div>
                    </div>
                    <div class="health-card">
                      <div class="health-title">Volatility & Regime</div>
                      <div class="health-line">ATR(14): <span class="mono">6.2</span></div>
                      <div class="health-line">Volatility: High</div>
                      <div class="health-line">Regime: Trend Up</div>
                    </div>
                    <div class="health-card">
                      <div class="health-title">Active Strategies</div>
                      <div class="health-line">ORR: Enabled</div>
                      <div class="health-line">OSB: Enabled</div>
                      <div class="health-line">VWFT: Enabled</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="panel" style="margin-top:14px;">
              <div class="panel-header">
                <h2>Last Signals · Mini Ticket Strip</h2>
                <span>Market → Worklist → Tickets continuity</span>
              </div>
              <div class="panel-body scroll-y" id="market-signals"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- ANALYTICS -->
      <section id="view-analytics" class="hidden">
        <div class="filter-bar">
          <div class="filter-pill">Date Range ▾</div>
          <div class="filter-pill">Symbol ▾</div>
          <div class="filter-pill">Strategy ▾</div>
          <div class="filter-pill">Regime ▾</div>
          <div class="filter-pill">Volatility ▾</div>
          <div class="filter-search">
            <span style="font-size:11px;color:var(--text-muted);">🔍</span>
            <input placeholder="Search notes / flags…" />
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h2>Analytics · Performance & Drift</h2>
            <span>Diagnostics only · Feeds Strategy Lab</span>
          </div>
          <div class="panel-body">
            <div class="kpi-row" id="analytics-kpis"></div>

            <div class="layout-two-wide" style="margin-bottom:14px;">
              <div class="chart-shell">
                <div class="chart-main">
                  <svg id="analytics-pnl"></svg>
                </div>
                <div class="chart-legend">
                  <div class="legend-row">
                    <span class="legend-item"><span class="legend-dot"></span>Daily PnL</span>
                    <span class="legend-item"><span class="legend-dot signal"></span>Avg Score</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);">PnL / Score by Day · Flat dark chart</div>
                </div>
              </div>

              <div class="chart-shell">
                <div class="chart-main">
                  <svg id="analytics-regimes"></svg>
                </div>
                <div class="chart-legend">
                  <div class="legend-row">
                    <span class="legend-item"><span class="legend-dot"></span>Win% by Regime / ATR</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);">Win Rate by Regime & Volatility</div>
                </div>
              </div>
            </div>

            <div class="layout-two-wide" style="margin-bottom:14px;">
              <div class="chart-shell">
                <div class="chart-main">
                  <svg id="analytics-drift"></svg>
                </div>
                <div class="chart-legend">
                  <div class="legend-row">
                    <span class="legend-item"><span class="legend-dot"></span>Score Drift</span>
                    <span class="legend-item"><span class="legend-dot signal"></span>R:R Drift</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);">Drift Analysis</div>
                </div>
              </div>

              <div class="chart-shell">
                <div class="chart-main">
                  <svg id="analytics-config"></svg>
                </div>
                <div class="chart-legend">
                  <div class="legend-row">
                    <span class="legend-item"><span class="legend-dot"></span>Current Config</span>
                    <span class="legend-item"><span class="legend-dot signal"></span>Suggested Config</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);">Config Impact Comparison</div>
                </div>
              </div>
            </div>

            <div class="panel">
              <div class="panel-header">
                <h2>Strategy Performance Table</h2>
                <span>Strategy × Symbol × Regime summary</span>
              </div>
              <div class="panel-body scroll-y" id="analytics-table"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- SYSTEM -->
      <section id="view-system" class="hidden">
        <div class="panel">
          <div class="panel-header">
            <h2>System Health Overview</h2>
            <span>Data · Workers · Risk · Logs</span>
          </div>
          <div class="panel-body">
            <div class="health-row" id="system-health"></div>

            <div class="layout-two-wide" style="margin-top:12px;">
              <div class="panel">
                <div class="panel-header">
                  <h2>Symbol / Strategy Status</h2>
                  <span>Lag · Errors · Notes</span>
                </div>
                <div class="panel-body scroll-y" id="system-status"></div>
              </div>

              <div class="panel">
                <div class="panel-header">
                  <h2>Log Viewer</h2>
                  <span>Level · Component · Symbol · Strategy</span>
                </div>
                <div class="panel-body">
                  <div class="log-filter-bar">
                    <span class="log-filter-pill">Level ▾</span>
                    <span class="log-filter-pill">Component ▾</span>
                    <span class="log-filter-pill">Symbol ▾</span>
                    <span class="log-filter-pill">Strategy ▾</span>
                    <span class="log-filter-pill">Pause ⏸</span>
                  </div>
                  <div class="log-stream" id="system-logs"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- STRATEGY LAB -->
      <section id="view-lab" class="hidden">
        <div class="filter-bar">
          <div class="filter-pill">Strategy ▾</div>
          <div class="filter-pill">Symbol ▾</div>
          <div class="filter-pill">Config Set ▾</div>
          <div class="filter-pill">Environment: Sim / Prod</div>
          <div class="filter-pill">State: Saved · Last Updated: 09:52</div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h2>Strategy Lab · Config / Suggestions / Backtests</h2>
            <span>Config sets · Param deltas · Equity curve · Scenario tests</span>
          </div>
          <div class="panel-body">
            <div class="layout-three-lab">
              <div class="panel">
                <div class="panel-header">
                  <h2>Config Sets & Suggestions</h2>
                  <span>ORR / OSB / VWFT</span>
                </div>
                <div class="panel-body">
                  <div class="config-list" id="lab-config-list"></div>
                  <div style="margin-top:6px;">
                    <div class="details-label" style="margin-bottom:4px;">Suggestions</div>
                    <div><span class="suggestion-pill">[!] Raise ORR rrBandMin in trend</span></div>
                    <div style="margin-top:4px;"><span class="suggestion-pill">[!] Reduce OSB size in chop</span></div>
                  </div>
                </div>
              </div>

              <div class="panel">
                <div class="panel-header">
                  <h2>Active Config Editor</h2>
                  <span>Param · Current · Suggested · Impact</span>
                </div>
                <div class="panel-body lab-param-table" id="lab-param-table"></div>
                <div class="panel-body" style="border-top:1px solid rgba(255,255,255,0.06);">
                  <button style="font-size:10px;border-radius:999px;border:1px solid var(--border-strong);background:#050815;color:var(--text-secondary);padding:4px 10px;cursor:pointer;margin-right:6px;">Preview Impact</button>
                  <button style="font-size:10px;border-radius:999px;border:1px solid rgba(75,232,163,0.9);background:#071319;color:#c9ffe5;padding:4px 10px;cursor:pointer;margin-right:6px;">Apply Changes</button>
                  <button style="font-size:10px;border-radius:999px;border:1px solid rgba(170,177,205,0.9);background:#050815;color:var(--text-secondary);padding:4px 10px;cursor:pointer;">Reset</button>
                </div>
              </div>

              <div class="panel">
                <div class="panel-header">
                  <h2>Backtest Results</h2>
                  <span>Last 60 sessions · Projected impact</span>
                </div>
                <div class="panel-body">
                  <div class="equity-shell">
                    <svg id="lab-equity"></svg>
                  </div>
                  <div class="details-section" style="border-top:none;margin-top:6px;padding-top:4px;">
                    <div class="details-grid">
                      <div><div class="details-label">Win Rate</div><div class="mono">62% → 68%</div></div>
                      <div><div class="details-label">Profit Factor</div><div class="mono">1.8 → 2.1</div></div>
                      <div><div class="details-label">Max Drawdown</div><div class="mono">-3.2% → -2.1%</div></div>
                      <div><div class="details-label">Sharpe</div><div class="mono">1.21 → 1.48</div></div>
                    </div>
                  </div>
                  <div class="details-section">
                    <div class="details-label">Scenario Tests</div>
                    <div class="scenario-list" id="lab-scenarios"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script>
    (function () {
      function $(id) { return document.getElementById(id); }

      function pad2(n) { return (n < 10 ? "0" : "") + n; }

      function randBetween(min, max) {
        return min + Math.random() * (max - min);
      }

      function sparkBlocks(values) {
        var chars = "▁▂▃▄▅▆▇█";
        var out = "";
        for (var i = 0; i < values.length; i++) {
          var v = values[i];
          var idx = Math.max(0, Math.min(chars.length - 1, Math.floor(v * chars.length)));
          out += chars.charAt(idx);
        }
        return out;
      }

      function riskClass(risk) {
        if (risk === "green") return "risk-green";
        if (risk === "amber") return "risk-amber";
        return "risk-red";
      }

      function strengthClass(t) {
        if (t === "up") return "strength-up";
        if (t === "down") return "strength-down";
        return "strength-flat";
      }

      function strengthSymbol(t) {
        if (t === "up") return "↑";
        if (t === "down") return "↓";
        return "→";
      }

      function trendClass(t) {
        if (t === "up") return "trend-up";
        if (t === "down") return "trend-down";
        return "trend-sideways";
      }

      function trendSymbol(t) {
        if (t === "up") return "↗";
        if (t === "down") return "↘";
        return "↔";
      }

      // ---------- NAV ----------
      var views = ["worklist", "tickets", "markets", "analytics", "system", "lab"];
      views.forEach(function (name) {
        var nav = $("nav-" + name);
        if (!nav) return;
        nav.addEventListener("click", function () {
          views.forEach(function (n) {
            var v = $("view-" + n);
            var btn = $("nav-" + n);
            if (!v || !btn) return;
            if (n === name) {
              v.classList.remove("hidden");
              btn.classList.add("active");
            } else {
              v.classList.add("hidden");
              btn.classList.remove("active");
            }
          });
        });
      });

      // ---------- DATA ----------
      var regimes = ["TrendUp", "TrendDn", "Chop", "OR Break"];
      var vwapPos = ["VW+", "VW-", "VW±", "VW++"];
      var orCtx = ["ORIn", "OROut", "ORMid"];
      var volStates = ["ATR High", "ATR Low", "ATR Mid"];

      var worklistRows = [];
      var ticketsRows = [];

      function buildWorklist() {
        worklistRows = [];
        for (var i = 0; i < 24; i++) {
          var score = 80 + Math.floor(Math.random() * 20);
          var trend = (i % 3 === 0) ? "up" : ((i % 3 === 1) ? "flat" : "down");
          var strategy = ["ORR", "OSB", "VWFT"][i % 3];
          var risk = (i % 5 === 0) ? "amber" : "green";
          var contracts = (risk === "amber") ? 1 : 2;
          var entry = 4520 + i * 0.5 + Math.random();
          var stopTicks = -(8 + (i % 4));
          var targetTicks = Math.abs(stopTicks) * 2;
          var rr = (targetTicks / Math.abs(stopTicks)).toFixed(1);
          var timeRemaining = Math.max(0, 30 - i);
          var spark = [];
          for (var s = 0; s < 14; s++) spark.push(0.4 + Math.random() * 0.6);

          worklistRows.push({
            id: "WL-" + pad2(i),
            score: score,
            trend: trend,
            strategy: strategy,
            risk: risk,
            contracts: contracts,
            entry: entry.toFixed(2),
            stopTicks: stopTicks,
            targetTicks: targetTicks,
            rr: rr,
            timeRemainingMin: timeRemaining,
            context: {
              regime: regimes[i % regimes.length],
              vwapPosition: vwapPos[i % vwapPos.length],
              orContext: orCtx[i % orCtx.length],
              volatility: volStates[i % volStates.length]
            },
            spark: spark
          });
        }
      }

      function buildTickets() {
        ticketsRows = [];
        var statuses = ["Actioned", "Rejected", "Expired", "Downranked"];
        var syms = ["ES", "NQ", "CL"];
        var strats = ["ORR", "OSB", "VWFT"];

        for (var i = 0; i < 28; i++) {
          var sym = syms[i % syms.length];
          var strat = strats[i % strats.length];
          var status = statuses[i % statuses.length];
          var risk = (status === "Actioned") ? "green" :
                     (status === "Downranked" ? "amber" : "red");
          var trend = (i % 3 === 0) ? "up" : ((i % 3 === 1) ? "flat" : "down");
          var score = 70 + Math.floor(Math.random() * 30);
          var entry = 4500 + i * 0.7 + Math.random();
          var stopTicks = -(6 + (i % 4));
          var reasonCat = (status === "Rejected") ? "Risk Blocked" :
                          (status === "Expired") ? "Expired" :
                          (status === "Downranked") ? "Arbitrated Out" : "—";
          var reasonSummary =
            (status === "Rejected") ? "Max contracts exceeded" :
            (status === "Expired") ? "Age > 30m" :
            (status === "Downranked") ? "Lost arbitration" :
            "Executed";

          var spark = [];
          for (var s = 0; s < 12; s++) spark.push(0.4 + Math.random() * 0.6);

          ticketsRows.push({
            id: "TK-" + sym + "-" + pad2(i),
            time: "09:" + pad2(40 + i),
            symbol: sym,
            strategy: strat,
            status: status,
            risk: risk,
            trend: trend,
            score: score,
            entry: entry.toFixed(2),
            stopTicks: stopTicks,
            reasonCat: reasonCat,
            reasonSummary: reasonSummary,
            spark: spark
          });
        }
      }

      // ---------- RENDER WORKLIST ----------
      function renderWorklist() {
        var el = $("worklist-table");
        if (!el) return;

        var html = '<table><thead><tr>' +
          '<th>Score</th>' +
          '<th>Str</th>' +
          '<th>Strategy</th>' +
          '<th>Risk</th>' +
          '<th>Contracts</th>' +
          '<th>Entry</th>' +
          '<th>Stop</th>' +
          '<th>Target</th>' +
          '<th>R:R</th>' +
          '<th>Context</th>' +
          '<th>Time</th>' +
          '<th>Spark</th>' +
        '</tr></thead><tbody>';

        for (var i = 0; i < worklistRows.length; i++) {
          var r = worklistRows[i];
          var sparkCls = r.risk === "green" ? "spark-green" :
                         r.risk === "amber" ? "spark-amber" : "spark-red";

          html += '<tr data-wlid="' + r.id + '">' +
            '<td class="num mono">' + r.score + '</td>' +
            '<td><span class="strength ' + strengthClass(r.trend) + '">' +
              strengthSymbol(r.trend) + '</span></td>' +
            '<td>' + r.strategy + '</td>' +
            '<td><span class="risk-pill ' + riskClass(r.risk) + '">' +
              r.risk.toUpperCase() + '</span></td>' +
            '<td class="num mono">' + r.contracts + '</td>' +
            '<td class="num mono">' + r.entry + '</td>' +
            '<td class="num mono">' + r.stopTicks + 't</td>' +
            '<td class="num mono">+' + r.targetTicks + 't</td>' +
            '<td class="num mono">' + r.rr + '</td>' +
            '<td><div class="ctx-tags">' +
              '<span class="ctx-pill">' + r.context.regime + '</span>' +
              '<span class="ctx-pill">' + r.context.vwapPosition + '</span>' +
              '<span class="ctx-pill">' + r.context.orContext + '</span>' +
              '<span class="ctx-pill">' + r.context.volatility + '</span>' +
            '</div></td>' +
            '<td class="num mono">' + r.timeRemainingMin + 'm</td>' +
            '<td class="spark ' + sparkCls + '">' + sparkBlocks(r.spark) + '</td>' +
          '</tr>';
        }

        html += '</tbody></table>';
        el.innerHTML = html;

        var rows = el.querySelectorAll("tbody tr");
        for (var j = 0; j < rows.length; j++) {
          rows[j].addEventListener("click", function () {
            var id = this.getAttribute("data-wlid");
            var item = null;
            for (var k = 0; k < worklistRows.length; k++) {
              if (worklistRows[k].id === id) { item = worklistRows[k]; break; }
            }
            if (item) updateWorklistDetails(item);
          });
        }

        if (worklistRows.length > 0) updateWorklistDetails(worklistRows[0]);
      }

      function updateWorklistDetails(r) {
        var header = $("wl-header-main");
        if (header) {
          header.textContent =
            r.strategy + " · ES · Score " + r.score +
            " · Risk " + r.risk.toUpperCase() +
            " · " + r.timeRemainingMin + "m remaining";
        }

        var tg = $("wl-trade-grid");
        if (tg) {
          tg.innerHTML =
            '<div><div class="details-label">Entry</div><div class="mono">' + r.entry + '</div></div>' +
            '<div><div class="details-label">Contracts</div><div class="mono">' + r.contracts + '</div></div>' +
            '<div><div class="details-label">Stop</div><div class="mono">' + r.stopTicks + 't</div></div>' +
            '<div><div class="details-label">Target</div><div class="mono">+' + r.targetTicks + 't</div></div>' +
            '<div><div class="details-label">R:R</div><div class="mono">' + r.rr + '</div></div>' +
            '<div><div class="details-label">Time Remaining</div><div class="mono">' + r.timeRemainingMin + 'm</div></div>';
        }

        var cg = $("wl-context-grid");
        if (cg) {
          cg.innerHTML =
            '<div><div class="details-label">Regime</div><div>' + r.context.regime + '</div></div>' +
            '<div><div class="details-label">Volatility</div><div>' + r.context.volatility + '</div></div>' +
            '<div><div class="details-label">VWAP Position</div><div>' + r.context.vwapPosition + '</div></div>' +
            '<div><div class="details-label">OR Context</div><div>' + r.context.orContext + '</div></div>';
        }

        var sLine = $("wl-score-line");
        if (sLine) {
          sLine.textContent = "Trend+20 | VWAP+15 | Volatility+10 | Structure+12 | Composite " + r.score;
        }

        var cfg = $("wl-config-text");
        if (cfg) {
          cfg.textContent = "Config: ORR_ES_D1 · rrBandMin=1.3 · stopTicks=8 · ATRFactor=1.0";
        }
      }

      // ---------- RENDER TICKETS ----------
      function renderTickets() {
        var el = $("tickets-table");
        if (!el) return;

        var html = '<table><thead><tr>' +
          '<th>Time</th>' +
          '<th>Symbol</th>' +
          '<th>Strategy</th>' +
          '<th>Score</th>' +
          '<th>Str</th>' +
          '<th>Risk</th>' +
          '<th>Status</th>' +
          '<th>ReasonCat</th>' +
          '<th>Reason</th>' +
          '<th>Entry</th>' +
          '<th>Stop</th>' +
          '<th>Spark</th>' +
        '</tr></thead><tbody>';

        for (var i = 0; i < ticketsRows.length; i++) {
          var t = ticketsRows[i];
          var sCls = t.risk === "green" ? "spark-green" :
                     t.risk === "amber" ? "spark-amber" : "spark-red";
          var stCls =
            (t.status === "Actioned") ? "status-actioned" :
            (t.status === "Rejected") ? "status-rejected" :
            (t.status === "Expired") ? "status-expired" :
            "status-downrank";

          html += '<tr data-tkid="' + t.id + '">' +
            '<td class="num mono">' + t.time + '</td>' +
            '<td>' + t.symbol + '</td>' +
            '<td>' + t.strategy + '</td>' +
            '<td class="num mono">' + t.score + '</td>' +
            '<td><span class="strength ' + strengthClass(t.trend) + '">' +
              strengthSymbol(t.trend) + '</span></td>' +
            '<td><span class="risk-pill ' + riskClass(t.risk) + '">' +
              t.risk.toUpperCase().charAt(0) + '</span></td>' +
            '<td><span class="status-tag ' + stCls + '">' + t.status + '</span></td>' +
            '<td>' + t.reasonCat + '</td>' +
            '<td>' + t.reasonSummary + '</td>' +
            '<td class="num mono">' + t.entry + '</td>' +
            '<td class="num mono">' + t.stopTicks + 't</td>' +
            '<td class="spark ' + sCls + '">' + sparkBlocks(t.spark) + '</td>' +
          '</tr>';
        }

        html += '</tbody></table>';
        el.innerHTML = html;

        var rows = el.querySelectorAll("tbody tr");
        for (var j = 0; j < rows.length; j++) {
          rows[j].addEventListener("click", function () {
            var id = this.getAttribute("data-tkid");
            var item = null;
            for (var k = 0; k < ticketsRows.length; k++) {
              if (ticketsRows[k].id === id) { item = ticketsRows[k]; break; }
            }
            if (item) updateTicketDetails(item);
          });
        }

        if (ticketsRows.length > 0) updateTicketDetails(ticketsRows[0]);
      }

      function updateTicketDetails(t) {
        var h = $("tk-header-main");
        if (h) {
          h.textContent =
            t.strategy + " · " + t.symbol + " · " + t.time +
            " · " + t.status + " (" + t.reasonCat + ")";
        }

        var tg = $("tk-trade-grid");
        if (tg) {
          var stopPrice = (parseFloat(t.entry) - Math.abs(t.stopTicks) * 0.25).toFixed(2);
          var target = (parseFloat(t.entry) + Math.abs(t.stopTicks) * 0.5).toFixed(2);
          var rr = (Math.abs(t.stopTicks) * 0.5 / (Math.abs(t.stopTicks) * 0.25)).toFixed(1);

          tg.innerHTML =
            '<div><div class="details-label">Entry</div><div class="mono">' + t.entry + '</div></div>' +
            '<div><div class="details-label">Stop</div><div class="mono">' + stopPrice + ' (' + t.stopTicks + 't)</div></div>' +
            '<div><div class="details-label">Target</div><div class="mono">' + target + '</div></div>' +
            '<div><div class="details-label">Contracts</div><div class="mono">2</div></div>' +
            '<div><div class="details-label">R:R</div><div class="mono">' + rr + '</div></div>' +
            '<div><div class="details-label">Time in Force</div><div>DAY</div></div>';
        }

        var sLine = $("tk-score-line");
        if (sLine) {
          sLine.textContent = "Trend+20 | VWAP+15 | Volatility+10 | Structure+12 | Composite " + t.score;
        }

        var cg = $("tk-context-grid");
        if (cg) {
          cg.innerHTML =
            '<div><div class="details-label">Regime</div><div>' +
              regimes[ticketsRows.indexOf(t) % regimes.length] + '</div></div>' +
            '<div><div class="details-label">ATR</div><div>' +
              volStates[ticketsRows.indexOf(t) % volStates.length] + '</div></div>' +
            '<div><div class="details-label">VWAP</div><div>Above</div></div>' +
            '<div><div class="details-label">OR</div><div>Outside Range</div></div>';
        }

        var cfg = $("tk-config-text");
        if (cfg) {
          cfg.textContent = "Config Snapshot: ORR_ES_D1 vs ORR_ES_Prod";
        }
      }

      // ---------- MARKETS ----------
      function drawSimpleLine(svgId, points, opts) {
        var svg = $(svgId);
        if (!svg) return;
        var w = 960, h = 260;
        svg.setAttribute("viewBox", "0 0 " + w + " " + h);

        var min = points[0], max = points[0];
        for (var i = 1; i < points.length; i++) {
          if (points[i] < min) min = points[i];
          if (points[i] > max) max = points[i];
        }
        if (max === min) max = min + 1;

        function sx(i) {
          if (points.length === 1) return w / 2;
          return 24 + (w - 48) * (i / (points.length - 1));
        }
        function sy(v) {
          return h - 20 - ((v - min) / (max - min)) * (h - 40);
        }

        for (var g = 0; g <= 5; g++) {
          var y = 10 + ((h - 20) * g / 5);
          var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", 20);
          line.setAttribute("x2", w - 20);
          line.setAttribute("y1", y);
          line.setAttribute("y2", y);
          line.setAttribute("stroke", "rgba(255,255,255,0.06)");
          line.setAttribute("stroke-width", "0.5");
          svg.appendChild(line);
        }

        var path = "";
        for (var i = 0; i < points.length; i++) {
          var x = sx(i);
          var y = sy(points[i]);
          path += (i === 0 ? "M" : "L") + x + " " + y + " ";
        }

        var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", path);
        p.setAttribute("fill", "none");
        p.setAttribute("stroke", opts.stroke || "#42e2f4");
        p.setAttribute("stroke-width", opts.width || 1.4);
        svg.appendChild(p);
      }

      function drawMarketChart() {
        var prices = [];
        var vwap = [];
        var base = 4520;
        var v = base;
        var vw = base - 2;
        for (var i = 0; i < 80; i++) {
          v = v + (Math.random() - 0.48) * 4;
          vw = vw * 0.95 + v * 0.05;
          prices.push(v);
          vwap.push(vw);
        }

        var svg = $("market-chart");
        if (!svg) return;
        var w = 960, h = 260;
        svg.setAttribute("viewBox", "0 0 " + w + " " + h);

        var min = Math.min.apply(null, prices);
        var max = Math.max.apply(null, prices);
        var pad = 3;
        min -= pad; max += pad;
        if (max === min) max = min + 1;

        function sx(i) {
          return 24 + (w - 48) * (i / (prices.length - 1));
        }
        function sy(v) {
          return h - 20 - ((v - min) / (max - min)) * (h - 40);
        }

        for (var g = 0; g <= 5; g++) {
          var y = 10 + ((h - 20) * g / 5);
          var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", 20);
          line.setAttribute("x2", w - 20);
          line.setAttribute("y1", y);
          line.setAttribute("y2", y);
          line.setAttribute("stroke", "rgba(255,255,255,0.06)");
          line.setAttribute("stroke-width", "0.5");
          svg.appendChild(line);
        }

        var candles = [];
        for (var i = 0; i < prices.length; i++) {
          var p = prices[i];
          var open = p + (Math.random() - 0.5) * 2;
          var close = p + (Math.random() - 0.5) * 2;
          var high = Math.max(open, close) + Math.random() * 2;
          var low = Math.min(open, close) - Math.random() * 2;
          candles.push({ open: open, close: close, high: high, low: low });
        }

        var candleWidth = (w - 40) / prices.length;
        for (var i = 0; i < candles.length; i++) {
          var c = candles[i];
          var cx = sx(i);
          var yH = sy(c.high);
          var yL = sy(c.low);
          var yO = sy(c.open);
          var yC = sy(c.close);
          var bt = Math.min(yO, yC);
          var bb = Math.max(yO, yC);
          var bh = Math.max(2, bb - bt);
          var col = c.close >= c.open ? "#4be8a3" : "#ff6a6a";

          var wLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
          wLine.setAttribute("x1", cx);
          wLine.setAttribute("x2", cx);
          wLine.setAttribute("y1", yH);
          wLine.setAttribute("y2", yL);
          wLine.setAttribute("stroke", col);
          wLine.setAttribute("stroke-width", "1");
          svg.appendChild(wLine);

          var body = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          body.setAttribute("x", cx - candleWidth * 0.32);
          body.setAttribute("y", bt);
          body.setAttribute("width", candleWidth * 0.64);
          body.setAttribute("height", bh);
          body.setAttribute("fill", col);
          svg.appendChild(body);
        }

        var pathV = "";
        var pathU = "";
        var pathL = "";
        for (var i = 0; i < vwap.length; i++) {
          var vw = vwap[i];
          var atr = 6 + Math.sin(i / 10) * 1.8;
          var up = vw + atr;
          var lo = vw - atr;
          var x = sx(i);
          var yV = sy(vw);
          var yU = sy(up);
          var yL = sy(lo);
          pathV += (i === 0 ? "M" : "L") + x + " " + yV + " ";
          pathU += (i === 0 ? "M" : "L") + x + " " + yU + " ";
          pathL += (i === 0 ? "M" : "L") + x + " " + yL + " ";
        }

        function mkPath(d, stroke, width, dash, op) {
          var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
          p.setAttribute("d", d);
          p.setAttribute("fill", "none");
          p.setAttribute("stroke", stroke);
          p.setAttribute("stroke-width", width);
          if (dash) p.setAttribute("stroke-dasharray", dash);
          if (op) p.setAttribute("opacity", op);
          svg.appendChild(p);
        }

        mkPath(pathV, "#42e2f4", 1.6, "", 1);
        mkPath(pathU, "#ffc466", 1.1, "4 3", 0.9);
        mkPath(pathL, "#ffc466", 1.1, "4 3", 0.9);

        for (var i = 10; i < prices.length; i += 18) {
          var circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circ.setAttribute("cx", sx(i));
          circ.setAttribute("cy", sy(prices[i]));
          circ.setAttribute("r", 4);
          circ.setAttribute("fill", "#4be8a3");
          svg.appendChild(circ);
        }
      }

      function renderMarketSignals() {
        var el = $("market-signals");
        if (!el) return;
        var html = '<table><thead><tr>' +
          '<th>Time</th>' +
          '<th>Symbol</th>' +
          '<th>Strategy</th>' +
          '<th>Score</th>' +
          '<th>Risk</th>' +
          '<th>Context</th>' +
        '</tr></thead><tbody>';

        for (var i = 0; i < 8; i++) {
          var r = worklistRows[i];
          html += '<tr>' +
            '<td class="num mono">09:' + pad2(55 - i) + '</td>' +
            '<td>ES</td>' +
            '<td>' + r.strategy + '</td>' +
            '<td class="num mono">' + r.score + '</td>' +
            '<td><span class="risk-pill ' + riskClass(r.risk) + '">' + r.risk.toUpperCase() + '</span></td>' +
            '<td><div class="ctx-tags">' +
              '<span class="ctx-pill">' + r.context.regime + '</span>' +
              '<span class="ctx-pill">' + r.context.vwapPosition + '</span>' +
            '</div></td>' +
          '</tr>';
        }
        html += '</tbody></table>';
        el.innerHTML = html;
      }

      // ---------- ANALYTICS ----------
      function renderAnalyticsKPIs() {
        var el = $("analytics-kpis");
        if (!el) return;
        var items = [
          { label: "Net PnL", value: "+24.6R", delta: "+3.2R vs prev", good: true },
          { label: "Win Rate", value: "63%", delta: "+5pp vs prev", good: true },
          { label: "Max Drawdown", value: "-3.4R", delta: "-0.8R vs prev", good: true },
          { label: "Avg R:R", value: "1.9", delta: "-0.1 vs prev", good: false }
        ];
        var html = "";
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          html += '<div class="kpi-card">' +
            '<div class="kpi-label">' + it.label + '</div>' +
            '<div class="kpi-value">' + it.value + '</div>' +
            '<div class="kpi-delta ' + (it.good ? "good" : "bad") + '">' + it.delta + '</div>' +
          '</div>';
        }
        el.innerHTML = html;
      }

      function drawAnalyticsCharts() {
        var len = 20;
        var pnl = [];
        var score = [];
        var regWins = [0.58, 0.66, 0.52, 0.71];
        var driftScore = [];
        var driftRR = [];
        var cfgCurrent = [];
        var cfgSuggested = [];

        for (var i = 0; i < len; i++) {
          pnl.push(randBetween(-1.5, 2.5));
          score.push(randBetween(70, 88));
          driftScore.push(0.5 + Math.sin(i / 4) * 0.2 + Math.random() * 0.1);
          driftRR.push(0.7 + Math.cos(i / 6) * 0.2 + Math.random() * 0.1);
          cfgCurrent.push(randBetween(0.8, 1.0));
          cfgSuggested.push(cfgCurrent[cfgCurrent.length - 1] + randBetween(0.02, 0.12));
        }

        drawSimpleLine("analytics-pnl", pnl, { stroke: "#42e2f4", width: 1.6 });
        drawSimpleLine("analytics-drift", driftScore, { stroke: "#9b5cff", width: 1.4 });

        var svgReg = $("analytics-regimes");
        if (svgReg) {
          var w = 960, h = 260;
          svgReg.setAttribute("viewBox", "0 0 " + w + " " + h);
          var labels = ["TrendUp", "TrendDn", "Chop", "OR Break"];
          var max = 0.8;
          for (var i = 0; i < regWins.length; i++) {
            var x = 80 + i * 140;
            var barH = (regWins[i] / max) * 160;
            var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", x - 20);
            rect.setAttribute("y", h - 40 - barH);
            rect.setAttribute("width", 40);
            rect.setAttribute("height", barH);
            rect.setAttribute("fill", "#42e2f4");
            svgReg.appendChild(rect);

            var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", x);
            label.setAttribute("y", h - 20);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("fill", "rgba(232,237,249,0.8)");
            label.setAttribute("font-size", "11");
            label.textContent = labels[i];
            svgReg.appendChild(label);

            var val = document.createElementNS("http://www.w3.org/2000/svg", "text");
            val.setAttribute("x", x);
            val.setAttribute("y", h - 46 - barH);
            val.setAttribute("text-anchor", "middle");
            val.setAttribute("fill", "rgba(232,237,249,0.9)");
            val.setAttribute("font-size", "11");
            val.textContent = Math.round(regWins[i] * 100) + "%";
            svgReg.appendChild(val);
          }
        }

        var svgCfg = $("analytics-config");
        if (svgCfg) {
          var w2 = 960, h2 = 260;
          svgCfg.setAttribute("viewBox", "0 0 " + w2 + " " + h2);
          var baseY = h2 - 30;
          var step = (w2 - 40) / cfgCurrent.length;
          var pathC = "";
          var pathS = "";
          for (var i = 0; i < cfgCurrent.length; i++) {
            var x = 20 + i * step;
            var yC = baseY - cfgCurrent[i] * 100;
            var yS = baseY - cfgSuggested[i] * 100;
            pathC += (i === 0 ? "M" : "L") + x + " " + yC + " ";
            pathS += (i === 0 ? "M" : "L") + x + " " + yS + " ";
          }
          var pC = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pC.setAttribute("d", pathC);
          pC.setAttribute("fill", "none");
          pC.setAttribute("stroke", "#42e2f4");
          pC.setAttribute("stroke-width", "1.6");
          svgCfg.appendChild(pC);

          var pS = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pS.setAttribute("d", pathS);
          pS.setAttribute("fill", "none");
          pS.setAttribute("stroke", "#4be8a3");
          pS.setAttribute("stroke-width", "1.6");
          pS.setAttribute("stroke-dasharray", "5 3");
          svgCfg.appendChild(pS);
        }
      }

      function renderAnalyticsTable() {
        var el = $("analytics-table");
        if (!el) return;
        var html = '<table><thead><tr>' +
          '<th>Strategy</th>' +
          '<th>Symbol</th>' +
          '<th>Regime</th>' +
          '<th>Win%</th>' +
          '<th>Avg R</th>' +
          '<th>PF</th>' +
          '<th>Trades</th>' +
        '</tr></thead><tbody>';

        var strats = ["ORR", "OSB", "VWFT"];
        var syms = ["ES", "NQ", "CL"];
        for (var i = 0; i < strats.length; i++) {
          for (var j = 0; j < syms.length; j++) {
            var win = 0.5 + Math.random() * 0.25;
            var avgR = 1.5 + Math.random() * 0.6;
            var pf = 1.4 + Math.random() * 0.8;
            var trades = 60 + Math.floor(Math.random() * 40);
            var reg = regimes[(i + j) % regimes.length];
            html += '<tr>' +
              '<td>' + strats[i] + '</td>' +
              '<td>' + syms[j] + '</td>' +
              '<td>' + reg + '</td>' +
              '<td class="num mono">' + Math.round(win * 100) + '%</td>' +
              '<td class="num mono">' + avgR.toFixed(2) + '</td>' +
              '<td class="num mono">' + pf.toFixed(2) + '</td>' +
              '<td class="num mono">' + trades + '</td>' +
            '</tr>';
          }
        }

        html += '</tbody></table>';
        el.innerHTML = html;
      }

      // ---------- SYSTEM ----------
      function renderSystemHealth() {
        var el = $("system-health");
        if (!el) return;
        var cards = [
          {
            title: "Data Ingest",
            lines: [
              "Yahoo bars: OK (15s lag)",
              "Session metrics: OK",
              "Gap-fill worker: OK"
            ]
          },
          {
            title: "Tickets API",
            lines: [
              "Latency (p95): 48ms",
              "5xx last 10m: 0",
              "Queue depth: 2"
            ]
          },
          {
            title: "Risk Layer",
            lines: [
              "Max contracts: 2",
              "Consecutive losses: 1/3",
              "Daily R limit: 0.7/3.0"
            ]
          },
          {
            title: "UI / Dashboard",
            lines: [
              "Websocket: Connected",
              "Last update: 09:" + pad2(50),
              "Build: v1.0.3-mock"
            ]
          }
        ];
        var html = "";
        for (var i = 0; i < cards.length; i++) {
          var c = cards[i];
          html += '<div class="health-card">' +
            '<div class="health-title">' + c.title + '</div>';
          for (var j = 0; j < c.lines.length; j++) {
            html += '<div class="health-line">' + c.lines[j] + '</div>';
          }
          html += '</div>';
        }
        el.innerHTML = html;
      }

      function renderSystemStatus() {
        var el = $("system-status");
        if (!el) return;
        var html = '<table><thead><tr>' +
          '<th>Symbol</th>' +
          '<th>Strategy</th>' +
          '<th>Status</th>' +
          '<th>Lag</th>' +
          '<th>Errors</th>' +
          '<th>Notes</th>' +
        '</tr></thead><tbody>';

        var syms = ["ES", "NQ", "CL", "YM"];
        var strats = ["ORR", "OSB", "VWFT"];
        for (var i = 0; i < syms.length; i++) {
          for (var j = 0; j < strats.length; j++) {
            var lag = (Math.random() < 0.8) ? "≤ 5s" : "15s";
            var err = (Math.random() < 0.9) ? 0 : 1;
            var status = (err === 0 && lag === "≤ 5s") ? "Healthy" : "Degraded";
            var notes = (status === "Healthy") ? "OK" :
                        (err > 0) ? "Recent error spike" : "Lagging bars";
            html += '<tr>' +
              '<td>' + syms[i] + '</td>' +
              '<td>' + strats[j] + '</td>' +
              '<td>' + status + '</td>' +
              '<td class="num mono">' + lag + '</td>' +
              '<td class="num mono">' + err + '</td>' +
              '<td>' + notes + '</td>' +
            '</tr>';
          }
        }
        html += '</tbody></table>';
        el.innerHTML = html;
      }

      function renderSystemLogs() {
        var el = $("system-logs");
        if (!el) return;
        var lines = [
          { level: "INFO", comp: "ingest:yahoo", msg: "Bars upserted for ES 2024-10-30 09:35", cls: "ok" },
          { level: "INFO", comp: "metrics:session", msg: "SessionMetrics recomputed ES 2024-10-30", cls: "ok" },
          { level: "WARN", comp: "risk:apex", msg: "Consecutive losses 2/3 reached for ES ORR", cls: "warn" },
          { level: "INFO", comp: "tickets", msg: "Ticket TK-ES-07 actioned (2 contracts)", cls: "ok" },
          { level: "ERROR", comp: "ingest:yahoo", msg: "Temporary HTTP 429 · backing off", cls: "error" },
          { level: "INFO", comp: "ingest:yahoo", msg: "Recovered after HTTP 429", cls: "ok" }
        ];
        var out = "";
        for (var i = 0; i < lines.length; i++) {
          var l = lines[i];
          out += '<div class="log-line ' + l.cls + '">' +
            '[09:' + pad2(40 + i) + '] ' +
            l.level + " " + l.comp + " · " + l.msg +
          '</div>';
        }
        el.innerHTML = out;
      }

      // ---------- STRATEGY LAB ----------
      function renderLabConfigList() {
        var el = $("lab-config-list");
        if (!el) return;
        var cfgs = [
          { name: "ORR_ES_Prod", meta: "Live · Last 09:12" },
          { name: "ORR_ES_TrendUp_Tuned", meta: "Draft · +3.2R last 30d" },
          { name: "OSB_ES_Chop_Conservative", meta: "Draft · -DD in chop" },
          { name: "VWFT_ES_Session", meta: "Live · +Stable" }
        ];
        var html = "";
        for (var i = 0; i < cfgs.length; i++) {
          var c = cfgs[i];
          html += '<div class="config-row' + (i === 1 ? " active" : "") + '">' +
            '<span class="name">' + c.name + '</span>' +
            '<span class="meta">' + c.meta + '</span>' +
          '</div>';
        }
        el.innerHTML = html;
      }

      function renderLabParamTable() {
        var el = $("lab-param-table");
        if (!el) return;
        var rows = [
          { param: "rrBandMin", cur: "1.3", sug: "1.6", impact: "+WinRate in TrendUp", type: "good" },
          { param: "maxContracts", cur: "2", sug: "1", impact: "-Drawdown in chop", type: "risk" },
          { param: "holdMinutes", cur: "12", sug: "9", impact: "+R in trend + more signals", type: "good" },
          { param: "minScore", cur: "80", sug: "84", impact: "Fewer but cleaner tickets", type: "good" }
        ];

        var html = '<table><thead><tr>' +
          '<th>Param</th>' +
          '<th>Current</th>' +
          '<th>Suggested</th>' +
          '<th>Impact</th>' +
        '</tr></thead><tbody>';
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          var cls = (r.type === "good") ? "good" :
                    (r.type === "risk") ? "risk" : "";
          html += '<tr>' +
            '<td>' + r.param + '</td>' +
            '<td class="num mono">' + r.cur + '</td>' +
            '<td class="num mono">' + r.sug + '</td>' +
            '<td><span class="impact-chip ' + cls + '">' + r.impact + '</span></td>' +
          '</tr>';
        }
        html += '</tbody></table>';
        el.innerHTML = html;
      }

      function drawLabEquity() {
        var svg = $("lab-equity");
        if (!svg) return;
        var w = 420, h = 150;
        svg.setAttribute("viewBox", "0 0 " + w + " " + h);

        var ptsBase = [];
        var ptsNew = [];
        var v1 = 0, v2 = 0;
        for (var i = 0; i < 40; i++) {
          v1 += randBetween(-0.1, 0.25);
          v2 += randBetween(-0.05, 0.3);
          ptsBase.push(v1);
          ptsNew.push(v2);
        }

        function scale(points) {
          var min = Math.min.apply(null, points);
          var max = Math.max.apply(null, points);
          if (max === min) max = min + 1;
          return { min: min, max: max };
        }

        function sx(i) {
          return 18 + (w - 36) * (i / (ptsBase.length - 1));
        }

        function sy(v, info) {
          return h - 18 - ((v - info.min) / (info.max - info.min)) * (h - 36);
        }

        var info = scale(ptsBase.concat(ptsNew));
        var path1 = "";
        var path2 = "";
        for (var i = 0; i < ptsBase.length; i++) {
          var x = sx(i);
          var y1 = sy(ptsBase[i], info);
          var y2 = sy(ptsNew[i], info);
          path1 += (i === 0 ? "M" : "L") + x + " " + y1 + " ";
          path2 += (i === 0 ? "M" : "L") + x + " " + y2 + " ";
        }

        var p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p1.setAttribute("d", path1);
        p1.setAttribute("fill", "none");
        p1.setAttribute("stroke", "#42e2f4");
        p1.setAttribute("stroke-width", "1.6");
        svg.appendChild(p1);

        var p2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p2.setAttribute("d", path2);
        p2.setAttribute("fill", "none");
        p2.setAttribute("stroke", "#4be8a3");
        p2.setAttribute("stroke-width", "1.6");
        p2.setAttribute("stroke-dasharray", "5 3");
        svg.appendChild(p2);
      }

      function renderLabScenarios() {
        var el = $("lab-scenarios");
        if (!el) return;
        var rows = [
          { label: "TrendUp + High ATR", status: "PASS", cls: "scenario-pass" },
          { label: "TrendDn + High ATR", status: "WARN (drawdown spike)", cls: "scenario-warn" },
          { label: "Chop + Low ATR", status: "PASS", cls: "scenario-pass" },
          { label: "OR Break Fakeout", status: "FAIL (stop cluster)", cls: "scenario-fail" }
        ];

        var html = "";
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          html += '<div class="scenario-row">' +
            '<div class="scenario-label">' + r.label + '</div>' +
            '<div class="scenario-status ' + r.cls + '">' + r.status + '</div>' +
          '</div>';
        }
        el.innerHTML = html;
      }

      // ---------- INIT ----------
      buildWorklist();
      buildTickets();

      renderWorklist();
      renderTickets();
      drawMarketChart();
      renderMarketSignals();

      renderAnalyticsKPIs();
      drawAnalyticsCharts();
      renderAnalyticsTable();

      renderSystemHealth();
      renderSystemStatus();
      renderSystemLogs();

      renderLabConfigList();
      renderLabParamTable();
      drawLabEquity();
      renderLabScenarios();
    })();
  </script>
</body>
</html>
HTML

############################################
# server.js
############################################
cat > server.js << 'JS'
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3200;

const server = http.createServer((req, res) => {
  const filePath = path.join(process.cwd(), "index.html");
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error loading index.html");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log("=== Prism Apex A2 mock (Worklist/Tickets/Markets/Analytics/System/Lab) running at http://localhost:" + PORT + " ===");
});
JS

echo "=== PRISM APEX — GENERATING A2 FULL MOCK (PORT 3200, NO NPM) ==="
node server.js
