#!/usr/bin/env bash
set -euo pipefail

# =========================
# index.html
# =========================
cat > index.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Prism Apex — Spec Mock (Worklist / Tickets / Markets / Analytics / System / Lab)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- Fonts: Space Grotesk (UI) + IBM Plex Mono (numbers) -->
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

  <style>
    :root {
      --bg-shell: #050814;
      --bg-panel: #080d1c;
      --bg-header: #0b1222;
      --bg-table: #0b0f1c;

      --border-subtle: rgba(255,255,255,0.07);
      --border-strong: rgba(145, 167, 255, 0.7);

      --text: #e8edf9;
      --text-secondary: #a1a9c3;
      --text-muted: #6c7594;

      --accent: #42e2f4;
      --accent-soft: rgba(66, 226, 244, 0.16);

      --risk-green: #4be8a3;
      --risk-amber: #ffc466;
      --risk-red: #ff6a6a;

      --card-health-bg: #0b0f1c;
      --log-bg: #050815;

      --chart-bg: #050814;
      --equity-bg: #050814;

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
      font-family: "Space Grotesk", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at 0% 0%, rgba(66,226,244,0.18), transparent 55%),
        radial-gradient(circle at 100% 100%, rgba(157,92,255,0.25), transparent 55%),
        #02030a;
    }

    .page-shell {
      max-width: 1520px;
      margin: 24px auto 36px;
      padding: 20px 26px 28px;
      border-radius: 24px;
      background: linear-gradient(140deg, rgba(5,9,24,0.98), rgba(2,4,12,0.98));
      border: 1px solid rgba(130, 154, 255, 0.4);
      box-shadow: var(--shadow-soft);
    }

    header.page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 18px;
    }

    .page-title-block h1 {
      margin: 0 0 4px;
      font-size: 16px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .page-title-block p {
      margin: 0;
      font-size: 11px;
      color: var(--text-muted);
    }

    .variant-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(7,12,30,0.98);
      border: 1px solid rgba(66,226,244,0.55);
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
      transition: background 150ms ease, color 150ms ease, transform 100ms ease;
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

    .filter-pill strong { color: var(--text); }

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

    .filter-search input::placeholder { color: var(--text-muted); }

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

    tbody tr:nth-child(2n) {
      background: #090d19;
    }

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
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      color: var(--text);
    }

    .monospace {
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    .risk-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
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
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 11px;
    }

    .strength-up { color: var(--risk-green); }
    .strength-flat { color: var(--text-muted); }
    .strength-down { color: var(--risk-red); }

    .trend-arrow {
      font-size: 11px;
    }

    .trend-up { color: var(--risk-green); }
    .trend-sideways { color: var(--text-muted); }
    .trend-down { color: var(--risk-red); }

    .spark {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 11px;
      letter-spacing: 0.08em;
    }

    .spark-green { color: var(--risk-green); }
    .spark-amber { color: var(--risk-amber); }
    .spark-red { color: var(--risk-red); }

    .context-tags {
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

    .tag-pill {
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10px;
      background: #050815;
      border: 1px solid rgba(117,137,210,0.9);
      color: var(--text-secondary);
    }

    .badge-soft {
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10px;
      background: #050815;
      border: 1px solid rgba(117,137,210,0.9);
      color: var(--text-secondary);
    }

    .chart-shell {
      border-radius: var(--radius-lg);
      background: var(--chart-bg); /* solid, no gradient */
      border: 1px solid var(--border-subtle);
      box-shadow: 0 18px 60px rgba(0,0,0,0.9);
      overflow: hidden;
    }

    .chart-main {
      height: 260px;
      background: var(--chart-bg); /* solid */
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
      background: var(--equity-bg); /* solid */
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

    .kpi-label {
      color: var(--text-muted);
      margin-bottom: 3px;
    }

    .kpi-value {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 13px;
      color: var(--text);
    }

    .kpi-delta.good { color: var(--risk-green); font-size: 11px; }
    .kpi-delta.bad  { color: var(--risk-red);   font-size: 11px; }

    .health-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .health-card {
      border-radius: 14px;
      padding: 8px 10px;
      background: var(--card-health-bg);
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
      font-family: "IBM Plex Mono", ui-monospace, monospace;
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

    .impact-chip.neutral {
      border-color: rgba(149,161,220,0.9);
      color: var(--text-secondary);
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

    .scenario-label {
      color: var(--text-secondary);
    }

    .scenario-status {
      font-size: 10px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
    }

    .scenario-pass { color: var(--risk-green); }
    .scenario-warn { color: var(--risk-amber); }
    .scenario-fail { color: var(--risk-red); }

    .view-hidden { display: none; }

    @media (max-width: 1260px) {
      .page-shell { margin: 16px; padding: 16px; }
      .layout-two,
      .market-layout,
      .layout-three-lab {
        grid-template-columns: minmax(0, 1fr);
      }
      .kpi-row, .health-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .scroll-y { max-height: 260px; }
    }

    @media (max-width: 860px) {
      .kpi-row, .health-row {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="page-shell">
    <header class="page-header">
      <div class="page-title-block">
        <h1>PRISM APEX — SPEC MOCK</h1>
        <p>Worklist · Tickets · Markets · Analytics · System · Strategy Lab</p>
      </div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:flex-end;">
        <div class="variant-badge">
          <span class="variant-dot"></span>
          <span>Spec-aligned · Dark A2 shell · Flat chart backgrounds</span>
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
      <!-- ========================= WORKLIST PAGE ========================= -->
      <section id="view-worklist">
        <div class="filter-bar">
          <div class="filter-pill">Symbol ▾</div>
          <div class="filter-pill">Strategy ▾</div>
          <div class="filter-pill">Score ≥ ▾</div>
          <div class="filter-pill">Risk: G/A</div>
          <div class="filter-pill">≤ 30m</div>
          <div class="filter-pill">Sort ▾</div>
          <div class="filter-pill">Mute: ORR | OSB | VWFT</div>
          <div class="filter-search">
            <span style="font-size:11px;color:var(--text-muted);">🔍</span>
            <input placeholder="Search signals…" />
          </div>
        </div>

        <div class="layout-two">
          <div class="panel">
            <div class="panel-header">
              <h2>Worklist · Tradeable Signals Only</h2>
              <span style="font-size:10px;color:var(--text-muted);">Risk-filtered · ≤ 30m age</span>
            </div>
            <div class="panel-body scroll-y" id="worklist-table-container"></div>
          </div>

          <div class="details-panel" id="worklist-details">
            <div class="details-header">
              <h3>Signal Details</h3>
              <span class="details-meta" id="worklist-header-meta">Pick a row to see execution block & context.</span>
            </div>
            <div class="details-body">
              <div class="details-section">
                <div class="details-grid" id="worklist-detail-top">
                  <div>
                    <div class="details-label">Strategy</div>
                    <div>—</div>
                  </div>
                  <div>
                    <div class="details-label">Symbol</div>
                    <div>—</div>
                  </div>
                  <div>
                    <div class="details-label">Score</div>
                    <div class="monospace">—</div>
                  </div>
                  <div>
                    <div class="details-label">Risk</div>
                    <div>—</div>
                  </div>
                </div>
              </div>

              <div class="details-section">
                <div class="details-label">Trade Block</div>
                <div class="details-grid" id="worklist-detail-trade">
                  <div>
                    <div class="details-label">Entry</div>
                    <div class="monospace">—</div>
                  </div>
                  <div>
                    <div class="details-label">Contracts</div>
                    <div class="monospace">—</div>
                  </div>
                  <div>
                    <div class="details-label">Stop / Target</div>
                    <div class="monospace">—</div>
                  </div>
                  <div>
                    <div class="details-label">R:R</div>
                    <div class="monospace">—</div>
                  </div>
                </div>
              </div>

              <div class="details-section">
                <div class="details-label">Market Context at Signal Time</div>
                <div class="details-grid" id="worklist-detail-context">
                  <div>
                    <div class="details-label">Regime</div>
                    <div>—</div>
                  </div>
                  <div>
                    <div class="details-label">ATR</div>
                    <div>—</div>
                  </div>
                  <div>
                    <div class="details-label">VWAP Position</div>
                    <div>—</div>
                  </div>
                  <div>
                    <div class="details-label">OR Position</div>
                    <div>—</div>
                  </div>
                </div>
              </div>

              <div class="details-section">
                <div class="details-label">Score Breakdown</div>
                <div id="worklist-detail-score" style="margin-top:4px;">
                  Trend: — · VWAP: — · Volatility: — · Structure: — · Composite: —
                </div>
              </div>

              <div class="details-section">
                <div class="details-label">Config Snapshot</div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
                  <span id="worklist-detail-config">—</span>
                  <button style="font-size:10px;border-radius:999px;border:1px solid var(--border-strong);background:#050815;color:var(--text-secondary);padding:3px 8px;cursor:pointer;">
                    Open in Strategy Lab
                  </button>
                </div>
              </div>

              <div class="details-section">
                <div class="details-label">Operator Notes</div>
                <textarea id="worklist-notes" style="margin-top:4px;width:100%;min-height:72px;border-radius:10px;border:1px solid rgba(117,137,210,0.9);background:#050815;color:var(--text);font-size:11px;padding:6px;font-family:'Space Grotesk',sans-serif;" placeholder="Add notes for this signal (mock, not persisted)…"></textarea>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================= TICKETS PAGE ========================= -->
      <section id="view-tickets" class="view-hidden">
        <div class="filter-bar">
          <div class="filter-pill">Date ▾</div>
          <div class="filter-pill">Symbol ▾</div>
          <div class="filter-pill">Strategy ▾</div>
          <div class="filter-pill">Status ▾</div>
          <div class="filter-pill">Reason Category ▾</div>
          <div class="filter-pill">Risk ▾</div>
          <div class="filter-search">
            <span style="font-size:11px;color:var(--text-muted);">🔍</span>
            <input placeholder="Search tickets by reason, notes, ID…" />
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h2>Tickets · Historical Audit</h2>
            <span style="font-size:10px;color:var(--text-muted);">Actioned · Rejected · Expired · Downranked</span>
          </div>
          <div class="panel-body">
            <div class="panel" style="margin-bottom:10px;">
              <div class="panel-body scroll-y" id="tickets-table-container"></div>
            </div>

            <div class="details-panel">
              <div class="details-header">
                <h3>Ticket Drilldown</h3>
                <span class="details-meta" id="ticket-header-meta">Select any ticket row to see full context.</span>
              </div>
              <div class="details-body" id="ticket-details-body">
                <div class="details-section">
                  <div class="details-label">Header</div>
                  <div id="ticket-header-main" style="margin-top:4px;">
                    Strategy — | Symbol — | Time — | Status — (Reason Category —)
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label">Trade Data</div>
                  <div class="details-grid" id="ticket-detail-trade">
                    <div><div class="details-label">Entry</div><div class="monospace">—</div></div>
                    <div><div class="details-label">Stop</div><div class="monospace">—</div></div>
                    <div><div class="details-label">Target</div><div class="monospace">—</div></div>
                    <div><div class="details-label">Contracts</div><div class="monospace">—</div></div>
                    <div><div class="details-label">R:R</div><div class="monospace">—</div></div>
                    <div><div class="details-label">Time in Force</div><div>—</div></div>
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label">Score Breakdown</div>
                  <div id="ticket-detail-score" style="margin-top:4px;">
                    Trend+— | VWAP+— | Volatility+— | Structure+— | Composite —
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label">Market Context at Time of Signal</div>
                  <div class="details-grid" id="ticket-detail-context">
                    <div><div class="details-label">Regime</div><div>—</div></div>
                    <div><div class="details-label">ATR</div><div>—</div></div>
                    <div><div class="details-label">VWAP</div><div>—</div></div>
                    <div><div class="details-label">OR</div><div>—</div></div>
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label">Config Snapshot</div>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
                    <span id="ticket-detail-config">—</span>
                    <button style="font-size:10px;border-radius:999px;border:1px solid var(--border-strong);background:#050815;color:var(--text-secondary);padding:3px 8px;cursor:pointer;">
                      Open in Strategy Lab
                    </button>
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label">Notes</div>
                  <textarea style="margin-top:4px;width:100%;min-height:72px;border-radius:10px;border:1px solid rgba(117,137,210,0.9);background:#050815;color:var(--text);font-size:11px;padding:6px;font-family:'Space Grotesk',sans-serif;" placeholder="Editable notes area (mock)…"></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================= MARKETS PAGE ========================= -->
      <section id="view-markets" class="view-hidden">
        <div class="filter-bar">
          <div class="filter-pill">Symbol ▾</div>
          <div class="filter-pill">Timeframe ▾</div>
          <div class="filter-pill">Session ▾</div>
          <div class="filter-pill">Overlays ▾</div>
          <div class="filter-pill">Compare ▾</div>
          <div class="filter-pill">Scrubber ◀──▶</div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h2>Market Context · VWAP / OR / ATR & Signals</h2>
            <span style="font-size:10px;color:var(--text-muted);">Visual validation of trade ideas · Non-execution</span>
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
                    <span class="legend-item"><span class="legend-dot signal"></span>Signal Markers</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);">
                    ES · 1m · Synthetic · Flat chart background (no gradient)
                  </div>
                </div>
              </div>

              <div class="panel">
                <div class="panel-header">
                  <h2>Context Cards</h2>
                  <span style="font-size:10px;color:var(--text-muted);">Session metrics · Regime · Active strategies</span>
                </div>
                <div class="panel-body">
                  <div class="health-row" style="grid-template-columns: repeat(1, minmax(0, 1fr)); gap:8px;">
                    <div class="health-card">
                      <div class="health-title">Session Metrics</div>
                      <div class="health-line">OR Width: <span class="monospace">12.5</span></div>
                      <div class="health-line">OR Midpoint: <span class="monospace">4518.25</span></div>
                      <div class="health-line">VWAP Slope: <span class="monospace">+0.32</span></div>
                      <div class="health-line">VWAP Deviation: <span class="monospace">+0.24%</span></div>
                    </div>
                    <div class="health-card">
                      <div class="health-title">Volatility & Regime</div>
                      <div class="health-line">ATR(14): <span class="monospace">6.2</span></div>
                      <div class="health-line">Volatility: High</div>
                      <div class="health-line">Trend: Trend Up</div>
                      <div class="health-line">OR Breakout: Above High</div>
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
                <span style="font-size:10px;color:var(--text-muted);">Market → Worklist → Tickets continuity</span>
              </div>
              <div class="panel-body scroll-y" id="market-signals-container"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================= ANALYTICS PAGE ========================= -->
      <section id="view-analytics" class="view-hidden">
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
            <span style="font-size:10px;color:var(--text-muted);">Diagnostics only · Supports Strategy Lab decisions</span>
          </div>
          <div class="panel-body">
            <div class="kpi-row" id="analytics-kpis"></div>

            <div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1.5fr);gap:14px;margin-bottom:14px;">
              <div class="chart-shell">
                <div class="chart-main">
                  <svg id="analytics-pnl"></svg>
                </div>
                <div class="chart-legend">
                  <div class="legend-row">
                    <span class="legend-item"><span class="legend-dot"></span>Daily PnL</span>
                    <span class="legend-item"><span class="legend-dot signal"></span>Avg Score</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);">PnL / Score by Day · Solid dark chart background</div>
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

            <div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1.5fr);gap:14px;margin-bottom:14px;">
              <div class="chart-shell">
                <div class="chart-main">
                  <svg id="analytics-drift"></svg>
                </div>
                <div class="chart-legend">
                  <div class="legend-row">
                    <span class="legend-item"><span class="legend-dot"></span>Score Drift</span>
                    <span class="legend-item"><span class="legend-dot signal"></span>R:R Drift</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);">Drift Analysis · Score / R:R over time</div>
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
                <span style="font-size:10px;color:var(--text-muted);">Strategy × Symbol × Regime summary</span>
              </div>
              <div class="panel-body scroll-y" id="analytics-table-container"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================= SYSTEM PAGE ========================= -->
      <section id="view-system" class="view-hidden">
        <div class="panel">
          <div class="panel-header">
            <h2>System Health Overview</h2>
            <span style="font-size:10px;color:var(--text-muted);">Data · Workers · Risk · Logs</span>
          </div>
          <div class="panel-body">
            <div class="health-row" id="system-health-cards"></div>

            <div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1.6fr);gap:14px;margin-top:12px;">
              <div class="panel">
                <div class="panel-header">
                  <h2>Symbol / Strategy Status</h2>
                  <span style="font-size:10px;color:var(--text-muted);">Lag · Errors · Notes</span>
                </div>
                <div class="panel-body scroll-y" id="system-status-table"></div>
              </div>

              <div class="panel">
                <div class="panel-header">
                  <h2>Log Viewer</h2>
                  <span style="font-size:10px;color:var(--text-muted);">Level · Component · Symbol · Strategy</span>
                </div>
                <div class="panel-body">
                  <div class="log-filter-bar">
                    <span class="log-filter-pill">Level ▾</span>
                    <span class="log-filter-pill">Component ▾</span>
                    <span class="log-filter-pill">Symbol ▾</span>
                    <span class="log-filter-pill">Strategy ▾</span>
                    <span class="log-filter-pill">Pause ⏸</span>
                  </div>
                  <div class="log-stream" id="system-log-stream"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================= STRATEGY LAB PAGE ========================= -->
      <section id="view-lab" class="view-hidden">
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
            <span style="font-size:10px;color:var(--text-muted);">Most analytical / decision-rich page</span>
          </div>
          <div class="panel-body">
            <div class="layout-three-lab">
              <div class="panel">
                <div class="panel-header">
                  <h2>Config Sets & Suggestions</h2>
                  <span style="font-size:10px;color:var(--text-muted);">ORR / OSB / VWFT</span>
                </div>
                <div class="panel-body">
                  <div class="config-list" id="config-list"></div>
                  <div style="margin-top:6px;">
                    <div class="details-label" style="margin-bottom:4px;">Suggestions</div>
                    <div>
                      <span class="suggestion-pill">[!] Raise rrBandMin (ORR)</span>
                    </div>
                    <div style="margin-top:4px;">
                      <span class="suggestion-pill">[!] Lower size in chop (OSB)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="panel">
                <div class="panel-header">
                  <h2>Active Config Editor</h2>
                  <span style="font-size:10px;color:var(--text-muted);">Param · Current · Suggested · Impact</span>
                </div>
                <div class="panel-body lab-param-table" id="lab-param-table"></div>
                <div class="panel-body" style="border-top:1px solid rgba(255,255,255,0.06);">
                  <button style="font-size:10px;border-radius:999px;border:1px solid var(--border-strong);background:#050815;color:var(--text-secondary);padding:4px 10px;cursor:pointer;margin-right:6px;">
                    Preview Impact
                  </button>
                  <button style="font-size:10px;border-radius:999px;border:1px solid rgba(75,232,163,0.9);background:#071319;color:#c9ffe5;padding:4px 10px;cursor:pointer;margin-right:6px;">
                    Apply Changes
                  </button>
                  <button style="font-size:10px;border-radius:999px;border:1px solid rgba(170,177,205,0.9);background:#050815;color:var(--text-secondary);padding:4px 10px;cursor:pointer;">
                    Reset
                  </button>
                </div>
              </div>

              <div class="panel">
                <div class="panel-header">
                  <h2>Backtest Results</h2>
                  <span style="font-size:10px;color:var(--text-muted);">Last 60 sessions · Projected impact</span>
                </div>
                <div class="panel-body">
                  <div class="equity-shell">
                    <svg id="equity-chart"></svg>
                  </div>
                  <div class="details-section" style="border-top:none;margin-top:6px;padding-top:4px;">
                    <div class="details-grid">
                      <div><div class="details-label">Win Rate</div><div class="monospace">62% → 68%</div></div>
                      <div><div class="details-label">Profit Factor</div><div class="monospace">1.8 → 2.1</div></div>
                      <div><div class="details-label">Max Drawdown</div><div class="monospace">-3.2% → -2.1%</div></div>
                      <div><div class="details-label">Sharpe</div><div class="monospace">1.21 → 1.48</div></div>
                    </div>
                  </div>
                  <div class="details-section">
                    <div class="details-label">Scenario Tests</div>
                    <div class="scenario-list" id="scenario-list"></div>
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

      var viewMap = {
        "nav-worklist": { view: "view-worklist" },
        "nav-tickets":  { view: "view-tickets"  },
        "nav-markets":  { view: "view-markets"  },
        "nav-analytics":{ view: "view-analytics"},
        "nav-system":   { view: "view-system"   },
        "nav-lab":      { view: "view-lab"      }
      };

      function pad2(n) { return (n < 10 ? "0" : "") + n; }

      var regimes = ["TrendUp", "TrendDn", "Chop", "OR Break"];
      var vwapPos = ["VW+", "VW-", "VW±", "VW++"];
      var orCtx   = ["ORIn", "OROut", "ORMid"];
      var volStates = ["ATR High", "ATR Low", "ATR Mid"];

      var worklistRows = [];
      var ticketsRows = [];

      function buildWorklistData() {
        worklistRows = [];
        for (var i = 0; i < 20; i++) {
          var score = 80 + Math.floor(Math.random() * 20);
          var strengthTrend = (i % 3 === 0) ? "up" : ((i % 3 === 1) ? "flat" : "down");
          var strategy = ["ORR", "OSB", "VWFT"][i % 3];
          var risk = (i % 5 === 0) ? "amber" : "green";
          var contracts = (risk === "amber") ? 1 : 2;
          var entry = 4520 + i * 0.5 + Math.random();
          var stopTicks = -(8 + (i % 4));
          var targetTicks = 2 * Math.abs(stopTicks);
          var rr = (targetTicks / Math.abs(stopTicks)).toFixed(1);
          var timeRemaining = 30 - i;
          var lastUpdated = "09:" + pad2(55 - i);
          var trend = (strengthTrend === "up") ? "up" :
                      (strengthTrend === "down") ? "down" : "sideways";
          var spark = [];
          for (var j = 0; j < 14; j++) {
            spark.push(0.4 + Math.random() * 0.6);
          }

          worklistRows.push({
            id: "WL-" + pad2(i),
            score: score,
            strengthTrend: strengthTrend,
            strategy: strategy,
            risk: risk,
            contracts: contracts,
            entry: entry.toFixed(2),
            stopTicks: stopTicks,
            targetTicks: targetTicks,
            rr: rr,
            context: {
              regime: regimes[i % regimes.length],
              vwapPosition: vwapPos[i % vwapPos.length],
              orContext: orCtx[i % orCtx.length],
              volatility: volStates[i % volStates.length]
            },
            priceTrend: trend,
            timeRemainingMin: Math.max(0, timeRemaining),
            sparkline: spark,
            lastUpdated: lastUpdated
          });
        }
      }

      function buildTicketsData() {
        ticketsRows = [];
        var statuses = ["Actioned", "Rejected", "Expired", "Downranked"];
        var syms = ["ES", "NQ", "CL"];
        var strats = ["ORR", "OSB", "VWFT"];
        for (var i = 0; i < 24; i++) {
          var sym = syms[i % syms.length];
          var strat = strats[i % strats.length];
          var status = statuses[i % statuses.length];
          var risk = (status === "Rejected" || status === "Expired") ? "red" :
                     (status === "Downranked" ? "amber" : "green");
          var strengthTrend = (i % 3 === 0) ? "up" : ((i % 3 === 1) ? "flat" : "down");
          var score = 70 + Math.floor(Math.random() * 30);
          var entry = 4500 + i * 0.7 + Math.random();
          var stopTicks = -(6 + (i % 4));
          var pnl = (status === "Actioned") ? (Math.random() * 8 - 2).toFixed(1) : "0.0";
          var reasonCat = (status === "Rejected") ? "Risk Blocked" :
                          (status === "Downranked") ? "Arbitrated Out" :
                          (status === "Expired") ? "Expired" :
                          "—";
          var reasonSummary = (status === "Rejected")
            ? "Max contracts exceeded"
            : (status === "Downranked")
              ? "Lost arbitration to higher score"
              : (status === "Expired")
                ? "Age > 30m"
                : "Executed";
          var spark = [];
          for (var j = 0; j < 12; j++) {
            spark.push(0.4 + Math.random() * 0.6);
          }

          ticketsRows.push({
            id: "TK-" + sym + "-" + pad2(i),
            time: "09:" + pad2(40 + i),
            symbol: sym,
            strategy: strat,
            score: score,
            strengthTrend: strengthTrend,
            risk: risk,
            status: status,
            reasonCat: reasonCat,
            reasonSummary: reasonSummary,
            entry: entry.toFixed(2),
            stopTicks: stopTicks,
            pnl: pnl,
            spark: spark
          });
        }
      }

      function renderSparkline(values) {
        var blocks = "▁▂▃▄▅▆▇█";
        var out = "";
        for (var i = 0; i < values.length; i++) {
          var v = values[i];
          var idx = Math.min(blocks.length - 1, Math.floor(v * blocks.length));
          out += blocks.charAt(idx);
        }
        return out;
      }

      function riskClass(risk) {
        return risk === "green" ? "risk-green" :
               risk === "amber" ? "risk-amber" :
               "risk-red";
      }

      function strengthClass(trend) {
        return trend === "up" ? "strength-up" :
               trend === "down" ? "strength-down" : "strength-flat";
      }

      function trendClass(t) {
        return t === "up" ? "trend-up" :
               t === "down" ? "trend-down" : "trend-sideways";
      }

      function trendSymbol(t) {
        return t === "up" ? "↗" : (t === "down" ? "↘" : "↔");
      }

      function renderWorklistTable() {
        var container = $("worklist-table-container");
        if (!container) return;

        var header =
          '<table>' +
            '<thead><tr>' +
              '<th>Score</th>' +
              '<th>Str</th>' +
              '<th>Strat</th>' +
              '<th>Risk</th>' +
              '<th>Cnt</th>' +
              '<th>Entry</th>' +
              '<th>Stop</th>' +
              '<th>Target</th>' +
              '<th>R:R</th>' +
              '<th>Context Tags</th>' +
              '<th>Trend</th>' +
              '<th>Time</th>' +
              '<th>Spark</th>' +
              '<th>Upd</th>' +
            '</tr></thead><tbody>';

        var rows = [];
        for (var i = 0; i < worklistRows.length; i++) {
          var row = worklistRows[i];
          var sparkCls = row.risk === "green" ? "spark-green" :
                         row.risk === "amber" ? "spark-amber" : "spark-red";
          rows.push(
            '<tr data-row-id="' + row.id + '">' +
              '<td class="num monospace">' + row.score + '</td>' +
              '<td><span class="strength ' + strengthClass(row.strengthTrend) + '">' +
                (row.strengthTrend === "up" ? "↑" :
                 row.strengthTrend === "down" ? "↓" : "→") +
              '</span></td>' +
              '<td>' + row.strategy + '</td>' +
              '<td><span class="risk-pill ' + riskClass(row.risk) + '">' +
                row.risk.toUpperCase() +
              '</span></td>' +
              '<td class="num monospace">' + row.contracts + '</td>' +
              '<td class="num monospace">' + row.entry + '</td>' +
              '<td class="num monospace">' + row.stopTicks + 't</td>' +
              '<td class="num monospace">+' + row.targetTicks + 't</td>' +
              '<td class="num monospace">' + row.rr + '</td>' +
              '<td><div class="context-tags">' +
                '<span class="ctx-pill">' + row.context.regime + '</span>' +
                '<span class="ctx-pill">' + row.context.vwapPosition + '</span>' +
                '<span class="ctx-pill">' + row.context.orContext + '</span>' +
                '<span class="ctx-pill">' + row.context.volatility + '</span>' +
              '</div></td>' +
              '<td class="trend-arrow ' + trendClass(row.priceTrend) + '">' +
                trendSymbol(row.priceTrend) +
              '</td>' +
              '<td class="num monospace">' + row.timeRemainingMin + 'm</td>' +
              '<td class="spark ' + sparkCls + '">' + renderSparkline(row.sparkline) + '</td>' +
              '<td class="num monospace">' + row.lastUpdated + '</td>' +
            '</tr>'
          );
        }

        container.innerHTML = header + rows.join("") + "</tbody></table>";

        var trs = container.querySelectorAll("tbody tr");
        for (var j = 0; j < trs.length; j++) {
          trs[j].addEventListener("click", function () {
            var id = this.getAttribute("data-row-id");
            var found = null;
            for (var k = 0; k < worklistRows.length; k++) {
              if (worklistRows[k].id === id) {
                found = worklistRows[k];
                break;
              }
            }
            if (found) updateWorklistDetails(found);
          });
        }

        if (worklistRows.length > 0) updateWorklistDetails(worklistRows[0]);
      }

      function updateWorklistDetails(row) {
        var headerMeta = $("worklist-header-meta");
        if (headerMeta) {
          headerMeta.textContent =
            row.strategy + " · ES · Score " + row.score +
            " · Risk " + row.risk.toUpperCase() +
            " · " + row.timeRemainingMin + "m remaining";
        }

        var top = $("worklist-detail-top");
        if (top) {
          var cells = top.querySelectorAll("div:nth-child(2)");
          if (cells.length >= 4) {
            cells[0].textContent = row.strategy;
            cells[1].textContent = "ES";
            cells[2].innerHTML = '<span class="monospace">' + row.score + '</span>';
            cells[3].innerHTML = '<span class="risk-pill ' + riskClass(row.risk) + '">' +
              row.risk.toUpperCase() + '</span>';
          }
        }

        var trade = $("worklist-detail-trade");
        if (trade) {
          var tCells = trade.querySelectorAll("div:nth-child(2)");
          if (tCells.length >= 4) {
            tCells[0].innerHTML = '<span class="monospace">' + row.entry + '</span>';
            tCells[1].innerHTML = '<span class="monospace">' + row.contracts + '</span>';
            tCells[2].innerHTML = '<span class="monospace">' +
              row.stopTicks + 't / +' + row.targetTicks + 't</span>';
            tCells[3].innerHTML = '<span class="monospace">' + row.rr + '</span>';
          }
        }

        var ctx = $("worklist-detail-context");
        if (ctx) {
          var cCells = ctx.querySelectorAll("div:nth-child(2)");
          if (cCells.length >= 4) {
            cCells[0].textContent = row.context.regime;
            cCells[1].textContent = "ATR High";
            cCells[2].textContent = row.context.vwapPosition;
            cCells[3].textContent = row.context.orContext;
          }
        }

        var scoreDetail = $("worklist-detail-score");
        if (scoreDetail) {
          scoreDetail.textContent =
            "Trend+" + (row.score - 70) +
            " | VWAP+" + 15 +
            " | Volatility+" + 10 +
            " | Structure+" + 12 +
            " | Composite " + row.score;
        }

        var cfg = $("worklist-detail-config");
        if (cfg) {
          cfg.textContent = "Config: ORR_ES_D1 · rrBandMin=1.3 · stopTicks=8 · ATRFactor=1.0";
        }
      }

      function renderTicketsTable() {
        var container = $("tickets-table-container");
        if (!container) return;

        var header =
          '<table>' +
            '<thead><tr>' +
              '<th>Time</th>' +
              '<th>Strat</th>' +
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

        var rows = [];
        for (var i = 0; i < ticketsRows.length; i++) {
          var t = ticketsRows[i];
          var sparkCls = t.risk === "green" ? "spark-green" :
                         t.risk === "amber" ? "spark-amber" : "spark-red";
          var statusCls =
            t.status === "Actioned"   ? "status-actioned" :
            t.status === "Rejected"   ? "status-rejected" :
            t.status === "Expired"    ? "status-expired" :
            "status-downrank";
          rows.push(
            '<tr data-ticket-id="' + t.id + '">' +
              '<td class="num monospace">' + t.time + '</td>' +
              '<td>' + t.strategy + '</td>' +
              '<td class="num monospace">' + t.score + '</td>' +
              '<td><span class="strength ' + strengthClass(t.strengthTrend) + '">' +
                (t.strengthTrend === "up" ? "↑" :
                 t.strengthTrend === "down" ? "↓" : "→") +
              '</span></td>' +
              '<td><span class="risk-pill ' + riskClass(t.risk) + '">' +
                t.risk.toUpperCase().charAt(0) +
              '</span></td>' +
              '<td><span class="status-tag ' + statusCls + '">' +
                t.status +
              '</span></td>' +
              '<td>' + t.reasonCat + '</td>' +
              '<td>' + t.reasonSummary + '</td>' +
              '<td class="num monospace">' + t.entry + '</td>' +
              '<td class="num monospace">' + t.stopTicks + 't</td>' +
              '<td class="spark ' + sparkCls + '">' + renderSparkline(t.spark) + '</td>' +
            '</tr>'
          );
        }

        container.innerHTML = header + rows.join("") + "</tbody></table>";

        var trs = container.querySelectorAll("tbody tr");
        for (var j = 0; j < trs.length; j++) {
          trs[j].addEventListener("click", function () {
            var id = this.getAttribute("data-ticket-id");
            var found = null;
            for (var k = 0; k < ticketsRows.length; k++) {
              if (ticketsRows[k].id === id) {
                found = ticketsRows[k];
                break;
              }
            }
            if (found) updateTicketDetails(found);
          });
        }

        if (ticketsRows.length > 0) updateTicketDetails(ticketsRows[0]);
      }

      function updateTicketDetails(t) {
        var headerMeta = $("ticket-header-meta");
        if (headerMeta) {
          headerMeta.textContent =
            t.strategy + " · " + t.symbol + " · " + t.time +
            " · " + t.status + " (" + t.reasonCat + ")";
        }

        var headerMain = $("ticket-header-main");
        if (headerMain) {
          headerMain.textContent =
            "Strategy " + t.strategy +
            " | Symbol " + t.symbol +
            " | " + t.time +
            " | Status: " + t.status +
            " (" + t.reasonCat + ")";
        }

        var trade = $("ticket-detail-trade");
        if (trade) {
          var cells = trade.querySelectorAll("div:nth-child(2)");
          if (cells.length >= 6) {
            var stop = t.entry - (Math.abs(t.stopTicks) * 0.25);
            var target = t.entry + (Math.abs(t.stopTicks) * 0.5);
            var rr = (Math.abs(t.stopTicks) * 0.5 / (Math.abs(t.stopTicks) * 0.25)).toFixed(1);
            cells[0].innerHTML = '<span class="monospace">' + t.entry + '</span>';
            cells[1].innerHTML = '<span class="monospace">' + stop.toFixed(2) + ' (' + t.stopTicks + 't)</span>';
            cells[2].innerHTML = '<span class="monospace">' + target.toFixed(2) + '</span>';
            cells[3].innerHTML = '<span class="monospace">2</span>';
            cells[4].innerHTML = '<span class="monospace">' + rr + '</span>';
            cells[5].textContent = "DAY";
          }
        }

        var scoreDetail = $("ticket-detail-score");
        if (scoreDetail) {
          scoreDetail.textContent =
            "Trend+20 | VWAP+15 | Volatility+10 | Structure+12 | Composite " + t.score;
        }

        var ctx = $("ticket-detail-context");
        if (ctx) {
          var cells = ctx.querySelectorAll("div:nth-child(2)");
          if (cells.length >= 4) {
            cells[0].textContent = regimes[ticketsRows.indexOf(t) % regimes.length];
            cells[1].textContent = volStates[ticketsRows.indexOf(t) % volStates.length];
            cells[2].textContent = "Above VWAP";
            cells[3].textContent = "Outside Range";
          }
        }

        var cfg = $("ticket-detail-config");
        if (cfg) {
          cfg.textContent = "Config Snapshot: ORR_ES_D1 vs current ORR_ES_Prod";
        }
      }

      function drawMarketChart() {
        var svg = $("market-chart");
        if (!svg) return;
        var width = 980;
        var height = 260;
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);

        var gridCount = 5;
        for (var i = 0; i <= gridCount; i++) {
          var y = 10 + ((height - 20) * i) / gridCount;
          var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", 20);
          line.setAttribute("x2", width - 20);
          line.setAttribute("y1", y);
          line.setAttribute("y2", y);
          line.setAttribute("stroke", "rgba(255,255,255,0.06)");
          line.setAttribute("stroke-width", "0.5");
          svg.appendChild(line);
        }

        var candles = [];
        var price = 4520;
        for (var c = 0; c < 50; c++) {
          var open = price;
          var change = (Math.random() - 0.4) * 5;
          var close = open + change;
          var high = Math.max(open, close) + 2.5 * Math.random();
          var low = Math.min(open, close) - 2.5 * Math.random();
          price = close;
          candles.push({ open: open, high: high, low: low, close: close });
        }

        var prices = [];
        for (var p = 0; p < candles.length; p++) {
          prices.push(candles[p].high);
          prices.push(candles[p].low);
        }
        var minP = Math.min.apply(null, prices) - 4;
        var maxP = Math.max.apply(null, prices) + 4;

        function sY(val) {
          return height - ((val - minP) / (maxP - minP)) * (height - 20) - 10;
        }

        var candleWidth = (width - 40) / candles.length;
        var pathVwap = "";
        var pathUpper = "";
        var pathLower = "";
        var vwapVal = candles[0].close;

        for (var idx = 0; idx < candles.length; idx++) {
          var cnd = candles[idx];
          var cx = 20 + idx * candleWidth + candleWidth / 2;
          var yHigh = sY(cnd.high);
          var yLow = sY(cnd.low);
          var yOpen = sY(cnd.open);
          var yClose = sY(cnd.close);
          var bodyTop = Math.min(yOpen, yClose);
          var bodyBottom = Math.max(yOpen, yClose);
          var bodyH = Math.max(2, bodyBottom - bodyTop);
          var color = cnd.close >= cnd.open ? "#4be8a3" : "#ff6a6a";

          var wick = document.createElementNS("http://www.w3.org/2000/svg", "line");
          wick.setAttribute("x1", cx);
          wick.setAttribute("x2", cx);
          wick.setAttribute("y1", yHigh);
          wick.setAttribute("y2", yLow);
          wick.setAttribute("stroke", color);
          wick.setAttribute("stroke-width", "1");
          wick.setAttribute("stroke-linecap", "round");
          svg.appendChild(wick);

          var body = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          body.setAttribute("x", cx - candleWidth * 0.32);
          body.setAttribute("width", candleWidth * 0.64);
          body.setAttribute("y", bodyTop);
          body.setAttribute("height", bodyH);
          body.setAttribute("fill", color);
          body.setAttribute("opacity", "0.9");
          svg.appendChild(body);

          vwapVal = vwapVal * 0.92 + cnd.close * 0.08;
          var atr = 6 + Math.sin(idx / 6) * 1.5;
          var upper = vwapVal + atr;
          var lower = vwapVal - atr;

          var yV = sY(vwapVal);
          var yU = sY(upper);
          var yL = sY(lower);

          pathVwap += (idx === 0 ? "M" : "L") + cx + " " + yV + " ";
          pathUpper += (idx === 0 ? "M" : "L") + cx + " " + yU + " ";
          pathLower += (idx === 0 ? "M" : "L") + cx + " " + yL + " ";
        }

        function mkPath(d, stroke, width, dash, opacity) {
          var pth = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pth.setAttribute("d", d);
          pth.setAttribute("fill", "none");
          pth.setAttribute("stroke", stroke);
          pth.setAttribute("stroke-width", width);
          if (dash) pth.setAttribute("stroke-dasharray", dash);
          if (opacity != null) pth.setAttribute("stroke-opacity", opacity);
          pth.setAttribute("stroke-linecap", "round");
          pth.setAttribute("stroke-linejoin", "round");
          svg.appendChild(pth);
        }

        mkPath(pathUpper, "#ffc466", 1, "4 4", 0.9);
        mkPath(pathLower, "#ffc466", 1, "4 4", 0.9);
        mkPath(pathVwap, "#42e2f4", 1.4, null, 1.0);
      }

      function renderMarketSignals() {
        var container = $("market-signals-container");
        if (!container) return;
        var rows = [];
        var count = Math.min(10, worklistRows.length);
        for (var i = 0; i < count; i++) {
          var row = worklistRows[i];
          rows.push(
            "<tr>" +
              '<td class="num monospace">09:' + pad2(40 + i) + "</td>" +
              "<td>" + row.strategy + "</td>" +
              '<td class="num monospace">' + row.score + "</td>" +
              '<td><span class="risk-pill ' + riskClass(row.risk) + '">' +
                row.risk.toUpperCase() +
              "</span></td>" +
              '<td class="status-tag status-actioned">Actioned</td>' +
              '<td class="num monospace">' + row.entry + "</td>" +
              '<td class="num monospace">' + row.stopTicks + "t</td>" +
              '<td class="num monospace">+' + row.targetTicks + "t</td>" +
              '<td class="spark ' + (row.risk === "green" ? "spark-green" : "spark-amber") + '">' +
                renderSparkline(row.sparkline) +
              "</td>" +
            "</tr>"
          );
        }

        container.innerHTML =
          "<table>" +
            "<thead><tr>" +
              "<th>Time</th>" +
              "<th>Strategy</th>" +
              "<th>Score</th>" +
              "<th>Risk</th>" +
              "<th>Status</th>" +
              "<th>Entry</th>" +
              "<th>Stop</th>" +
              "<th>Target</th>" +
              "<th>Sparkline</th>" +
            "</tr></thead>" +
            "<tbody>" + rows.join("") + "</tbody>" +
          "</table>";
      }

      function renderAnalyticsKpis() {
        var container = $("analytics-kpis");
        if (!container) return;
        container.innerHTML =
          '<div class="kpi-card">' +
            '<div class="kpi-label">Total Tickets</div>' +
            '<div class="kpi-value">1,248</div>' +
            '<div class="kpi-delta good">+8.2% vs prior 60 sessions</div>' +
          '</div>' +
          '<div class="kpi-card">' +
            '<div class="kpi-label">Win Rate (Actioned)</div>' +
            '<div class="kpi-value">62%</div>' +
            '<div class="kpi-delta good">+3.4 pts</div>' +
          '</div>' +
          '<div class="kpi-card">' +
            '<div class="kpi-label">Avg Score (Actioned)</div>' +
            '<div class="kpi-value">86</div>' +
            '<div class="kpi-delta good">Tighter band vs baseline</div>' +
          '</div>' +
          '<div class="kpi-card">' +
            '<div class="kpi-label">Max DD (Simulated)</div>' +
            '<div class="kpi-value">-3.4%</div>' +
            '<div class="kpi-delta bad">-0.7 pts vs baseline</div>' +
          '</div>';
      }

      function simpleLineChart(svgId, count, opts) {
        var svg = $(svgId);
        if (!svg) return;
        var width = opts.width || 600;
        var height = opts.height || 260;
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);

        var lines = opts.lines || 1;
        var series = [];
        var allVals = [];
        for (var l = 0; l < lines; l++) {
          var vals = [];
          var v = 0;
          for (var i = 0; i < count; i++) {
            v += (Math.random() - 0.5) * (opts.vol || 1.0);
            vals.push(v);
            allVals.push(v);
          }
          series.push(vals);
        }

        var minV = Math.min.apply(null, allVals) - 1;
        var maxV = Math.max.apply(null, allVals) + 1;

        function sY(val) {
          return height - ((val - minV) / (maxV - minV)) * (height - 20) - 10;
        }

        var stepX = (width - 40) / (count - 1);

        function buildPath(arr) {
          var d = "";
          for (var i = 0; i < arr.length; i++) {
            var x = 20 + i * stepX;
            var y = sY(arr[i]);
            d += (i === 0 ? "M" : "L") + x + " " + y + " ";
          }
          return d;
        }

        var colors = opts.colors || ["rgba(148,163,255,0.7)", "#4be8a3"];
        for (var s = 0; s < series.length; s++) {
          var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", buildPath(series[s]));
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", colors[s % colors.length]);
          path.setAttribute("stroke-width", s === 0 ? 1.2 : 1.5);
          path.setAttribute("stroke-linecap", "round");
          path.setAttribute("stroke-linejoin", "round");
          svg.appendChild(path);
        }
      }

      function drawAnalyticsPnL() {
        simpleLineChart("analytics-pnl", 40, {
          lines: 2,
          vol: 1.0,
          width: 600,
          height: 260,
          colors: ["rgba(148,163,255,0.9)", "#42e2f4"]
        });
      }

      function drawAnalyticsRegimes() {
        var svg = $("analytics-regimes");
        if (!svg) return;
        var width = 600;
        var height = 260;
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);

        var data = [
          { name: "TrendUp", win: 0.71 },
          { name: "TrendDn", win: 0.59 },
          { name: "Chop",    win: 0.52 },
          { name: "OR Break",win: 0.66 }
        ];

        var maxWin = 0.8;
        var barWidth = (width - 80) / data.length;
        for (var i = 0; i < data.length; i++) {
          var r = data[i];
          var x = 40 + i * barWidth + barWidth * 0.15;
          var h = (height - 60) * (r.win / maxWin);
          var y = height - 30 - h;

          var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rect.setAttribute("x", x);
          rect.setAttribute("y", y);
          rect.setAttribute("width", barWidth * 0.7);
          rect.setAttribute("height", h);
          rect.setAttribute("rx", 6);
          rect.setAttribute("fill", "rgba(66,226,244,0.9)");
          svg.appendChild(rect);

          var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.textContent = Math.round(r.win * 100) + "%";
          label.setAttribute("x", x + barWidth * 0.35);
          label.setAttribute("y", y - 4);
          label.setAttribute("text-anchor", "middle");
          label.setAttribute("fill", "#e8edf9");
          label.setAttribute("font-size", "11");
          svg.appendChild(label);

          var name = document.createElementNS("http://www.w3.org/2000/svg", "text");
          name.textContent = r.name;
          name.setAttribute("x", x + barWidth * 0.35);
          name.setAttribute("y", height - 14);
          name.setAttribute("text-anchor", "middle");
          name.setAttribute("fill", "#a1a9c3");
          name.setAttribute("font-size", "10");
          svg.appendChild(name);
        }
      }

      function drawAnalyticsDrift() {
        simpleLineChart("analytics-drift", 40, {
          lines: 2,
          vol: 0.7,
          width: 600,
          height: 260,
          colors: ["#42e2f4", "#4be8a3"]
        });
      }

      function drawAnalyticsConfigImpact() {
        var svg = $("analytics-config");
        if (!svg) return;
        var width = 600;
        var height = 260;
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);

        var metrics = [
          { name: "Win%", cur: 0.62, proj: 0.68 },
          { name: "DD",   cur: -0.032, proj: -0.021 },
          { name: "PF",   cur: 1.8, proj: 2.1 }
        ];

        var maxVal = 1;
        var barWidth = (width - 80) / metrics.length;
        for (var i = 0; i < metrics.length; i++) {
          var m = metrics[i];
          var xBase = 40 + i * barWidth;
          var wHalf = barWidth * 0.3;

          var cur = m.cur;
          var proj = m.proj;

          var valCur = (m.name === "DD") ? -cur : cur;
          var valProj = (m.name === "DD") ? -proj : proj;
          var maxM = Math.max(valCur, valProj);
          if (maxM > maxVal) maxVal = maxM;
        }

        function sY(val) {
          var scaled = val / maxVal;
          return height - 40 - scaled * (height - 80);
        }

        for (var j = 0; j < metrics.length; j++) {
          var mm = metrics[j];
          var xBase2 = 40 + j * barWidth;
          var wHalf2 = barWidth * 0.3;

          var vCur = (mm.name === "DD") ? -mm.cur : mm.cur;
          var vProj = (mm.name === "DD") ? -mm.proj : mm.proj;

          var yCur = sY(vCur);
          var yProj = sY(vProj);

          var rectCur = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rectCur.setAttribute("x", xBase2 + barWidth * 0.1);
          rectCur.setAttribute("y", yCur);
          rectCur.setAttribute("width", wHalf2);
          rectCur.setAttribute("height", height - 40 - yCur);
          rectCur.setAttribute("rx", 4);
          rectCur.setAttribute("fill", "rgba(148,163,255,0.8)");
          svg.appendChild(rectCur);

          var rectProj = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rectProj.setAttribute("x", xBase2 + barWidth * 0.1 + wHalf2 + 4);
          rectProj.setAttribute("y", yProj);
          rectProj.setAttribute("width", wHalf2);
          rectProj.setAttribute("height", height - 40 - yProj);
          rectProj.setAttribute("rx", 4);
          rectProj.setAttribute("fill", "#4be8a3");
          svg.appendChild(rectProj);

          var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.textContent = mm.name;
          label.setAttribute("x", xBase2 + barWidth * 0.5);
          label.setAttribute("y", height - 18);
          label.setAttribute("text-anchor", "middle");
          label.setAttribute("fill", "#a1a9c3");
          label.setAttribute("font-size", "10");
          svg.appendChild(label);
        }
      }

      function renderAnalyticsTable() {
        var container = $("analytics-table-container");
        if (!container) return;
        var rows = [];
        var strats = ["ORR", "OSB", "VWFT"];
        var syms = ["ES", "NQ", "CL"];
        for (var i = 0; i < 9; i++) {
          var strat = strats[i % strats.length];
          var sym = syms[i % syms.length];
          var tickets = 30 + Math.floor(Math.random() * 60);
          var win = (50 + Math.random() * 20).toFixed(1);
          var score = (80 + Math.random() * 10).toFixed(0);
          var rr = (1.4 + Math.random() * 0.8).toFixed(1);
          var atrUsed = volStates[i % volStates.length];
          var note = (i % 3 === 0) ? "Strong in Uptrend" :
                     (i % 3 === 1) ? "Weak in Chop" :
                     "ATR sensitive";
          rows.push(
            "<tr>" +
              "<td>" + strat + "</td>" +
              "<td>" + sym + "</td>" +
              '<td class="num monospace">' + tickets + "</td>" +
              '<td class="num monospace">' + win + "%</td>" +
              '<td class="num monospace">' + score + "</td>" +
              '<td class="num monospace">' + rr + "</td>" +
              "<td>" + atrUsed + "</td>" +
              "<td>" + note + "</td>" +
            "</tr>"
          );
        }

        container.innerHTML =
          "<table>" +
            "<thead><tr>" +
              "<th>Strategy</th>" +
              "<th>Symbol</th>" +
              "<th>Tickets</th>" +
              "<th>Win%</th>" +
              "<th>AvgScore</th>" +
              "<th>AvgR:R</th>" +
              "<th>ATR Used</th>" +
              "<th>Notes / Flags</th>" +
            "</tr></thead>" +
            "<tbody>" + rows.join("") + "</tbody>" +
          "</table>";
      }

      function renderSystemHealth() {
        var container = $("system-health-cards");
        if (!container) return;
        container.innerHTML =
          '<div class="health-card">' +
            '<div class="health-title">API / Ingress</div>' +
            '<div class="health-line">• OK</div>' +
            '<div class="health-line">• Latency: 45ms</div>' +
          '</div>' +
          '<div class="health-card">' +
            '<div class="health-title">DB / Storage</div>' +
            '<div class="health-line">• OK</div>' +
            '<div class="health-line">• Lag: 0.0s</div>' +
          '</div>' +
          '<div class="health-card">' +
            '<div class="health-title">Strategy Engine</div>' +
            '<div class="health-line">• All workers up</div>' +
            '<div class="health-line">• Last tick: 0.3s</div>' +
          '</div>' +
          '<div class="health-card">' +
            '<div class="health-title">Risk Engine</div>' +
            '<div class="health-line">• Hard-stop: ON</div>' +
            '<div class="health-line">• Alerts: 0</div>' +
          '</div>';
      }

      function renderSystemStatusTable() {
        var container = $("system-status-table");
        if (!container) return;
        var rows = [];
        var syms = ["ES", "NQ", "CL", "GC", "6E"];
        var strats = ["ORR", "OSB", "VWFT"];
        for (var i = 0; i < 15; i++) {
          var sym = syms[i % syms.length];
          var strat = strats[i % strats.length];
          var lag = (Math.random() * 0.8).toFixed(2);
          var errors = Math.random() < 0.2 ? Math.floor(Math.random() * 3) : 0;
          var status = errors > 0 || lag > 1 ? "WARN" : "OK";
          var note = (status === "OK") ? "Stable" : "Ingress delay";
          rows.push(
            "<tr>" +
              "<td>" + sym + "</td>" +
              "<td>" + strat + "</td>" +
              "<td>" + status + "</td>" +
              '<td class="num monospace">' + ("09:" + pad2(40 + i)) + "</td>" +
              '<td class="num monospace">' + lag + "s</td>" +
              '<td class="num monospace">' + errors + "</td>" +
              "<td>" + note + "</td>" +
            "</tr>"
          );
        }

        container.innerHTML =
          "<table>" +
            "<thead><tr>" +
              "<th>Symbol</th>" +
              "<th>Strategy</th>" +
              "<th>Status</th>" +
              "<th>Last Update</th>" +
              "<th>Data Lag</th>" +
              "<th>Errors (10m)</th>" +
              "<th>Notes</th>" +
            "</tr></thead>" +
            "<tbody>" + rows.join("") + "</tbody>" +
          "</table>";
      }

      function renderSystemLogs() {
        var container = $("system-log-stream");
        if (!container) return;
        var lines = [];
        for (var i = 0; i < 22; i++) {
          var lvl;
          var r = Math.random();
          if (r < 0.7) lvl = "ok";
          else if (r < 0.9) lvl = "warn";
          else lvl = "error";
          var ts = "09:" + pad2(10 + i) + ":0" + (i % 10);
          var msg;
          if (lvl === "ok") {
            msg = ts + " | INFO  | strategy-orr   | ES | Ticket generated (score=92 risk=GREEN)";
          } else if (lvl === "warn") {
            msg = ts + " | WARN  | ingress-yahoo  | CL | Ingress delay detected: 2.1s";
          } else {
            msg = ts + " | ERROR | risk-engine    | NQ | Risk check failed (DD limit reached)";
          }
          lines.push('<div class="log-line ' + lvl + '">' + msg + '</div>');
        }
        container.innerHTML = lines.join("");
      }

      var configs = [
        { id: "ORR_ES_D1", label: "ORR_ES_D1", status: "Active", env: "Sim" },
        { id: "ORR_NQ_H1", label: "ORR_NQ_H1", status: "Backtest-ready", env: "Sim" },
        { id: "OSB_ES_15m", label: "OSB_ES_15m", status: "Open", env: "Sim" },
        { id: "VWFT_CL_D1", label: "VWFT_CL_D1", status: "Prod-compatible", env: "Prod" }
      ];

      var paramRows = [
        { name: "rrBandMin",   current: 1.3,  suggested: 1.5, impact: "More selective", type: "risk" },
        { name: "rrBandMax",   current: 2.3,  suggested: 2.1, impact: "Slightly lower RR", type: "neutral" },
        { name: "stopTicks",   current: 8,    suggested: 10,  impact: "Safer · lower DD", type: "risk" },
        { name: "ATRFactor",   current: 1.0,  suggested: 1.2, impact: "Better vol fit", type: "good" },
        { name: "maxContracts",current: 2,    suggested: 2,   impact: "Guardrails intact", type: "neutral" }
      ];

      function renderConfigList() {
        var list = $("config-list");
        if (!list) return;
        var html = [];
        for (var i = 0; i < configs.length; i++) {
          var cfg = configs[i];
          var active = (i === 0) ? " active" : "";
          var right = (i === 0)
            ? '<span class="suggestion-pill">Active</span>'
            : '<span class="badge-soft">Open</span>';
          html.push(
            '<div class="config-row' + active + '" data-id="' + cfg.id + '">' +
              '<div>' +
                '<span class="name">' + cfg.label + '</span><br />' +
                '<span class="meta">' + cfg.env + ' · ' + cfg.status + '</span>' +
              '</div>' +
              right +
            '</div>'
          );
        }
        list.innerHTML = html.join("");

        var rows = list.querySelectorAll(".config-row");
        for (var j = 0; j < rows.length; j++) {
          rows[j].addEventListener("click", function () {
            var all = list.querySelectorAll(".config-row");
            for (var k = 0; k < all.length; k++) all[k].classList.remove("active");
            this.classList.add("active");
          });
        }
      }

      function renderParamTable() {
        var container = $("lab-param-table");
        if (!container) return;
        var html = [];
        html.push('<table><thead><tr>');
        html.push('<th>Param</th><th>Current</th><th>Suggested</th><th>Impact</th><th>?</th>');
        html.push('</tr></thead><tbody>');
        for (var i = 0; i < paramRows.length; i++) {
          var row = paramRows[i];
          var impactClass = row.type === "good" ? "good" :
                            row.type === "risk" ? "risk" : "neutral";
          html.push(
            "<tr>" +
              "<td>" + row.name + "</td>" +
              '<td class="num monospace">' + row.current + "</td>" +
              '<td class="num monospace">' + row.suggested + "</td>" +
              '<td><span class="impact-chip ' + impactClass + '">' + row.impact + "</span></td>" +
              '<td class="num monospace">[?]</td>' +
            "</tr>"
          );
        }
        html.push("</tbody></table>");
        container.innerHTML = html.join("");
      }

      function drawEquityCurve() {
        simpleLineChart("equity-chart", 40, {
          lines: 2,
          vol: 0.9,
          width: 420,
          height: 150,
          colors: ["rgba(148,163,255,0.9)", "#4be8a3"]
        });
      }

      function renderScenarioTests() {
        var container = $("scenario-list");
        if (!container) return;
        var rows = [
          { label: "Trend Up (Strong)", status: "PASS", cls: "scenario-pass" },
          { label: "Trend Down", status: "FAIL", cls: "scenario-fail" },
          { label: "Chop Day", status: "PASS", cls: "scenario-pass" },
          { label: "Volatility Spike", status: "WARN", cls: "scenario-warn" }
        ];
        var html = [];
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          html.push(
            '<div class="scenario-row">' +
              '<span class="scenario-label">' + r.label + '</span>' +
              '<span class="scenario-status ' + r.cls + '">' + r.status + '</span>' +
            '</div>'
          );
        }
        container.innerHTML = html.join("");
      }

      function initNav() {
        for (var id in viewMap) {
          if (!viewMap.hasOwnProperty(id)) continue;
          (function (navId) {
            var btn = $(navId);
            if (!btn) return;
            btn.addEventListener("click", function () {
              for (var key in viewMap) {
                if (!viewMap.hasOwnProperty(key)) continue;
                var b = $(key);
                var v = $(viewMap[key].view);
                if (b) b.classList.toggle("active", key === navId);
                if (v) v.classList.toggle("view-hidden", key !== navId);
              }
            });
          })(id);
        }
      }

      function init() {
        initNav();
        buildWorklistData();
        buildTicketsData();
        renderWorklistTable();
        renderTicketsTable();
        drawMarketChart();
        renderMarketSignals();
        renderAnalyticsKpis();
        drawAnalyticsPnL();
        drawAnalyticsRegimes();
        drawAnalyticsDrift();
        drawAnalyticsConfigImpact();
        renderAnalyticsTable();
        renderSystemHealth();
        renderSystemStatusTable();
        renderSystemLogs();
        renderConfigList();
        renderParamTable();
        drawEquityCurve();
        renderScenarioTests();
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
      } else {
        init();
      }
    })();
  </script>
</body>
</html>
HTML

# =========================
# server.js
# =========================
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
  console.log("=== Prism Apex SPEC MOCK running at http://localhost:" + PORT + " ===");
});
JS

echo "=== PRISM APEX — GENERATING SPEC MOCK (PORT 3200, NO NPM) ==="
node server.js
