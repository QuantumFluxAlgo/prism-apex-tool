#!/usr/bin/env bash
set -euo pipefail

# === index.html ===
cat > index.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Prism Apex — Full A2 Mock</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- Fonts: Satoshi (UI), Geist Mono (numeric) -->
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600&f[]=geist-mono@400,500&display=swap">

  <style>
    :root {
      --bg-shell: #050814;
      --bg-panel: rgba(9, 14, 32, 0.98);
      --bg-header: rgba(11, 18, 34, 0.96);

      --border-subtle: rgba(255,255,255,0.06);

      --text: #e5ecff;
      --text-secondary: #9ca7ce;
      --text-muted: #647095;

      --accent: #42e2f4;
      --accent-soft: rgba(66, 226, 244, 0.16);

      --risk-green: #4be8a3;
      --risk-amber: #ffc466;
      --risk-red: #ff6a6a;

      --chip-bg: rgba(17, 26, 52, 0.95);
      --shadow-soft: 0 24px 70px rgba(0,0,0,0.78);
      --radius-lg: 18px;

      --chart-bg: #050814;
      --equity-bg: #050814;
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
        radial-gradient(circle at 0% 0%, rgba(66,226,244,0.22), transparent 55%),
        radial-gradient(circle at 100% 100%, rgba(155,92,255,0.35), transparent 60%),
        radial-gradient(circle at 50% 100%, rgba(11,214,138,0.28), transparent 55%),
        #020410;
      overflow-y: auto;
    }

    .page-shell {
      max-width: 1520px;
      margin: 24px auto 36px;
      padding: 20px 26px 30px;
      border-radius: 24px;
      background: linear-gradient(135deg, rgba(6,10,26,0.98), rgba(3,6,18,0.98));
      box-shadow: var(--shadow-soft);
      border: 1px solid rgba(153, 181, 255, 0.2);
      backdrop-filter: blur(22px);
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 18px;
    }

    .page-title-block h1 {
      font-size: 16px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin: 0 0 4px;
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
      background: rgba(10, 18, 40, 0.95);
      border: 1px solid rgba(66, 226, 244, 0.4);
      font-size: 10px;
      color: var(--text-secondary);
    }

    .variant-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 18px rgba(66,226,244,0.8);
    }

    .top-nav {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      padding: 3px;
      border-radius: 999px;
      background: rgba(3,7,23,0.9);
      border: 1px solid rgba(99, 123, 214, 0.7);
      box-shadow: 0 14px 40px rgba(0,0,0,0.8);
      gap: 3px;
    }

    .top-nav button {
      position: relative;
      border: none;
      outline: none;
      padding: 6px 14px;
      font-size: 11px;
      border-radius: 999px;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: background 160ms ease, color 160ms ease, transform 120ms ease;
      white-space: nowrap;
    }

    .top-nav button.active {
      background:
        radial-gradient(circle at 0 0, rgba(66, 226, 244, 0.55), transparent 70%),
        radial-gradient(circle at 100% 100%, rgba(155, 92, 255, 0.7), transparent 75%);
      color: #050814;
      font-weight: 600;
    }

    .top-nav button.active::after {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      border: 1px solid rgba(11,214,138,0.55);
      box-shadow: 0 0 18px rgba(11,214,138,0.6);
      opacity: 0.85;
      pointer-events: none;
    }

    .top-nav button:not(.active):hover {
      background: rgba(22,32,70,0.9);
      color: var(--text);
      transform: translateY(-0.5px);
    }

    .chip-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 14px;
    }

    .chip-row span.label {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 10px;
      color: var(--text-secondary);
    }

    .chip {
      padding: 4px 9px;
      border-radius: 999px;
      background: rgba(10,18,40,0.9);
      border: 1px solid rgba(120, 140, 210, 0.6);
      color: var(--text-secondary);
    }

    .chip strong { color: var(--text); font-weight: 500; }

    .chip-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      margin-right: 4px;
      display: inline-block;
      background: var(--accent);
      box-shadow: 0 0 14px rgba(66,226,244,0.9);
    }

    main {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .panel {
      border-radius: var(--radius-lg);
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      box-shadow: 0 18px 50px rgba(0,0,0,0.85);
    }

    .panel-header {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      background: var(--bg-header);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .panel-header h2 {
      margin: 0;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .panel-body { padding: 10px 12px 12px; }

    .tag-pill {
      border-radius: 999px;
      padding: 2px 8px;
      border: 1px solid var(--border-subtle);
      background: var(--chip-bg);
      font-size: 10px;
      color: var(--text-secondary);
    }

    .badge-soft {
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10px;
      background: rgba(10,18,40,0.95);
      border: 1px solid rgba(114, 139, 220, 0.9);
      color: var(--text-secondary);
    }

    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 10px;
      background: rgba(9, 14, 32, 0.95);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }

    .filter-pill {
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid rgba(86, 109, 202, 0.9);
      background: rgba(9,13,32,0.95);
      font-size: 11px;
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .filter-search {
      flex: 1;
      min-width: 160px;
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid rgba(86,109,202,0.9);
      background: rgba(6,10,26,0.9);
      color: var(--text-secondary);
    }

    .filter-search input {
      border: none;
      outline: none;
      background: transparent;
      color: var(--text);
      font-size: 11px;
      width: 100%;
      padding-left: 4px;
    }

    .filter-search input::placeholder { color: var(--text-muted); }

    .layout-cols {
      display: grid;
      grid-template-columns: minmax(0, 3.2fr) minmax(0, 2.1fr);
      gap: 16px;
      margin-top: 12px;
    }

    .market-layout {
      display: grid;
      grid-template-columns: minmax(0, 3.3fr) minmax(0, 1.7fr);
      gap: 16px;
      margin-top: 12px;
    }

    .lab-layout {
      display: grid;
      grid-template-columns: 1.3fr 2.1fr 1.6fr;
      gap: 16px;
      margin-top: 12px;
    }

    .two-col-wide {
      display: grid;
      grid-template-columns: minmax(0, 2.2fr) minmax(0, 2.0fr);
      gap: 16px;
      margin-top: 12px;
    }

    .scroll-y {
      max-height: 380px;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .scroll-y::-webkit-scrollbar { width: 6px; }
    .scroll-y::-webkit-scrollbar-thumb {
      background: rgba(120, 136, 192, 0.8);
      border-radius: 999px;
    }

    .monospace {
      font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead { background: rgba(14, 22, 44, 0.98); }

    thead th {
      padding: 6px 6px;
      text-align: left;
      font-weight: 500;
      color: var(--text-secondary);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      white-space: nowrap;
    }

    tbody tr {
      background: rgba(6, 10, 26, 0.9);
      border-bottom: 1px solid rgba(255,255,255,0.03);
      transition: background 120ms ease, box-shadow 120ms ease;
    }

    tbody tr:nth-child(2n) { background: rgba(9, 13, 32, 0.92); }

    tbody tr:hover {
      background: rgba(15, 26, 58, 0.98);
      box-shadow: 0 0 0 1px var(--accent-soft);
    }

    tbody td { padding: 5px 6px; vertical-align: middle; color: var(--text-secondary); }

    tbody td.num { text-align: right; font-family: "Geist Mono", ui-monospace, monospace; color: var(--text); }

    .risk-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 500;
      font-family: "Geist Mono", ui-monospace, monospace;
    }

    .risk-green {
      background: rgba(75, 232, 163, 0.12);
      border: 1px solid rgba(75, 232, 163, 0.7);
      color: #c3ffe3;
    }

    .risk-amber {
      background: rgba(255, 196, 102, 0.13);
      border: 1px solid rgba(255, 196, 102, 0.75);
      color: #ffe8c5;
    }

    .risk-red {
      background: rgba(255, 106, 106, 0.16);
      border: 1px solid rgba(255, 106, 106, 0.75);
      color: #ffd3d3;
    }

    .strength { font-family: "Geist Mono", ui-monospace, monospace; font-size: 11px; }
    .strength.up   { color: var(--risk-green); }
    .strength.flat { color: var(--text-muted); }
    .strength.down { color: var(--risk-red); }

    .trend-arrow { font-size: 11px; }
    .trend-up   { color: var(--risk-green); }
    .trend-sideways { color: var(--text-muted); }
    .trend-down { color: var(--risk-red); }

    .spark {
      font-family: "Geist Mono", ui-monospace, monospace;
      font-size: 11px;
      letter-spacing: 0.08em;
      color: var(--accent);
    }

    .details-header {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 10px;
      align-items: center;
      margin-bottom: 8px;
    }

    .details-header h3 { margin: 0; font-size: 12px; color: var(--text); }

    .details-section {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed rgba(255,255,255,0.06);
      font-size: 11px;
      color: var(--text-secondary);
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 10px;
      font-size: 11px;
    }

    .details-label { color: var(--text-muted); }

    .chart-shell {
      border-radius: var(--radius-lg);
      background: #050814;
      border: 1px solid var(--border-subtle);
      box-shadow: 0 18px 50px rgba(0,0,0,0.85);
      overflow: hidden;
    }

    .chart-main {
      height: 260px;
      background: var(--chart-bg);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      position: relative;
    }

    .chart-main svg { width: 100%; height: 100%; display: block; }

    .chart-legend {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px 8px;
      font-size: 11px;
      background: rgba(4,8,20,0.95);
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
      font-size: 10px;
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

    .equity-shell svg { width: 100%; height: 100%; display: block; }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 12px;
      font-size: 11px;
    }

    .metric-label { color: var(--text-muted); }
    .metric-value { font-family: "Geist Mono", ui-monospace, monospace; color: var(--text); }

    .impact-chip {
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 10px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(10,16,34,0.95);
    }

    .impact-chip.good    { border-color: rgba(75,232,163,0.8); color: #c3ffe3; }
    .impact-chip.risk    { border-color: rgba(255,196,102,0.85); color: #ffe4b8; }
    .impact-chip.neutral { border-color: rgba(134,149,214,0.8); color: var(--text-secondary); }

    .config-list {
      max-height: 340px;
      overflow-y: auto;
      padding-right: 2px;
    }

    .config-row {
      border-radius: 10px;
      padding: 6px 8px;
      margin-bottom: 4px;
      background: rgba(8,12,30,0.95);
      border: 1px solid rgba(110, 138, 220, 0.7);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      cursor: pointer;
    }

    .config-row span.name { color: var(--text); }
    .config-row span.meta { font-size: 10px; color: var(--text-muted); }

    .config-row.active {
      background: radial-gradient(circle at 0 0, rgba(66, 226, 244, 0.65), transparent 60%),
                  rgba(6,10,28,1);
      box-shadow: 0 0 0 1px rgba(66,226,244,0.60), 0 16px 40px rgba(0,0,0,0.9);
    }

    .suggestion-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 10px;
      background: rgba(255,196,102,0.12);
      border: 1px solid rgba(255,196,102,0.8);
      color: #ffe6b5;
    }

    .lab-param-table { max-height: 340px; overflow-y: auto; }

    .lab-param-table table thead th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: rgba(12, 18, 40, 0.98);
    }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .kpi-card {
      border-radius: 14px;
      padding: 8px 10px;
      background: rgba(6, 10, 26, 0.97);
      border: 1px solid rgba(120, 140, 210, 0.7);
      box-shadow: 0 14px 40px rgba(0,0,0,0.8);
      font-size: 11px;
    }

    .kpi-label { color: var(--text-muted); margin-bottom: 4px; }
    .kpi-value { font-family: "Geist Mono", ui-monospace, monospace; font-size: 13px; color: var(--text); }
    .kpi-delta.good { color: var(--risk-green); font-size: 11px; }
    .kpi-delta.bad  { color: var(--risk-red); font-size: 11px; }

    .health-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .health-card {
      border-radius: 14px;
      padding: 8px 10px;
      background: rgba(6, 10, 22, 0.98);
      border: 1px solid rgba(120, 140, 210, 0.9);
      font-size: 11px;
    }

    .health-title { font-size: 11px; color: var(--text); margin-bottom: 4px; }
    .health-line { font-size: 10px; color: var(--text-secondary); }

    .log-stream {
      max-height: 220px;
      overflow-y: auto;
      font-size: 10px;
      font-family: "Geist Mono", ui-monospace, monospace;
      background: rgba(5, 9, 22, 0.98);
      border-radius: 12px;
      border: 1px solid rgba(120, 140, 210, 0.7);
      padding: 6px 8px;
    }

    .log-line.ok    { color: #9fe6c5; }
    .log-line.warn  { color: #ffe8a3; }
    .log-line.error { color: #ffb3b3; }

    .view-hidden { display: none; }

    @media (max-width: 1260px) {
      .page-shell { margin: 16px; padding: 16px; }
      .layout-cols,
      .market-layout,
      .lab-layout,
      .two-col-wide { grid-template-columns: minmax(0, 1fr); }
      .kpi-row, .health-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .scroll-y { max-height: 260px; }
    }

    @media (max-width: 840px) {
      .kpi-row, .health-row { grid-template-columns: minmax(0, 1fr); }
    }
  </style>
</head>
<body>
  <div class="page-shell">
    <header class="page-header">
      <div class="page-title-block">
        <h1>PRISM APEX — FULL A2 MOCK</h1>
        <p>Worklist · Tickets · Markets · Analytics · System · Strategy Lab</p>
      </div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:flex-end;">
        <div class="variant-badge">
          <span class="variant-dot"></span>
          <span>A2 · Ultra-Modern Fintech · Satoshi + Geist Mono</span>
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

    <div class="chip-row">
      <span class="label">Strategies</span>
      <span class="chip"><span class="chip-dot"></span><strong>ORR</strong> / OSB / VWAP-FT</span>
      <span class="label">Symbols</span>
      <span class="chip"><strong>ES</strong> / NQ / CL · Sim data</span>
      <span class="label" style="margin-left:auto;">Page</span>
      <span class="chip" id="view-label">Worklist (execution)</span>
    </div>

    <main>
      <!-- WORKLIST PAGE -->
      <section id="view-worklist">
        <div class="panel">
          <div class="filter-bar">
            <div class="filter-pill"><span>Symbol</span><strong>ES ▾</strong></div>
            <div class="filter-pill"><span>Strategy</span><strong>ORR / OSB / VWFT ▾</strong></div>
            <div class="filter-pill"><span>Score ≥</span><strong>80 ▾</strong></div>
            <div class="filter-pill"><span>Risk</span><strong>G / A ▾</strong></div>
            <div class="filter-pill"><span>Age</span><strong>≤ 30m</strong></div>
            <div class="filter-pill"><span>Sort</span><strong>Score ▾</strong></div>
            <div class="filter-search">
              <span style="font-size:11px;color:var(--text-muted);">🔍</span>
              <input placeholder="Search signals…" />
            </div>
          </div>

          <div class="layout-cols">
            <div class="panel" style="border-radius:0 0 18px 18px;">
              <div class="panel-header">
                <h2>Worklist · Tradeable Signals</h2>
                <span style="font-size:11px;color:var(--text-muted);">Synthetic · ~24 rows</span>
              </div>
              <div class="panel-body scroll-y" id="worklist-table-container"></div>
            </div>

            <div class="panel">
              <div class="panel-header">
                <h2>Signal Details · Drilldown</h2>
                <span class="badge-soft">Execution-ready · Linked to Tickets</span>
              </div>
              <div class="panel-body" id="details-panel">
                <div class="details-header">
                  <h3>Pick a row to see full context</h3>
                  <span class="tag-pill">ES · ORR · Sim</span>
                </div>
                <div class="details-section">
                  <div class="details-grid">
                    <div><div class="details-label">Strategy</div><div>—</div></div>
                    <div><div class="details-label">Symbol</div><div>—</div></div>
                    <div><div class="details-label">Score</div><div class="monospace">—</div></div>
                    <div><div class="details-label">Risk</div><div>—</div></div>
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label" style="margin-bottom:4px;">Trade Block</div>
                  <div class="details-grid">
                    <div><div class="details-label">Entry</div><div class="monospace">—</div></div>
                    <div><div class="details-label">Contracts</div><div class="monospace">—</div></div>
                    <div><div class="details-label">Stop / Target</div><div class="monospace">—</div></div>
                    <div><div class="details-label">R:R</div><div class="monospace">—</div></div>
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label" style="margin-bottom:4px;">Context at Signal Time</div>
                  <div class="details-grid">
                    <div><div class="details-label">Regime</div><div>—</div></div>
                    <div><div class="details-label">VWAP</div><div>—</div></div>
                    <div><div class="details-label">OR</div><div>—</div></div>
                    <div><div class="details-label">ATR</div><div>—</div></div>
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label" style="margin-bottom:4px;">Score Breakdown & Notes</div>
                  <div style="font-size:11px;color:var(--text-secondary);">
                    <div>Trend + VWAP + Volatility + Structure → Composite score.</div>
                    <div style="margin-top:6px;">Notes: <span class="monospace" id="details-notes">—</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- TICKETS PAGE -->
      <section id="view-tickets" class="view-hidden">
        <div class="panel">
          <div class="filter-bar">
            <div class="filter-pill"><span>State</span><strong>All ▾</strong></div>
            <div class="filter-pill"><span>Symbol</span><strong>ES / NQ / CL ▾</strong></div>
            <div class="filter-pill"><span>Strategy</span><strong>ORR / OSB / VWFT ▾</strong></div>
            <div class="filter-pill"><span>Window</span><strong>Today ▾</strong></div>
            <div class="filter-search">
              <span style="font-size:11px;color:var(--text-muted);">🔍</span>
              <input placeholder="Search tickets by ID or notes…" />
            </div>
          </div>

          <div class="panel-header">
            <h2>Tickets · Execution & Audit</h2>
            <span style="font-size:11px;color:var(--text-muted);">Synthetic feed · 32 tickets</span>
          </div>

          <div class="two-col-wide">
            <div class="panel" style="border-radius:0 0 18px 18px;">
              <div class="panel-body scroll-y" id="tickets-table-container"></div>
            </div>

            <div class="panel">
              <div class="panel-header">
                <h2>Ticket Drilldown</h2>
                <span class="badge-soft">Sibling of Worklist · Read-only</span>
              </div>
              <div class="panel-body" id="ticket-details-panel">
                <div class="details-header">
                  <h3>Select a ticket</h3>
                  <span class="tag-pill">ES · ORR · Sim</span>
                </div>
                <div class="details-section">
                  <div class="details-grid">
                    <div><div class="details-label">Ticket ID</div><div class="monospace">—</div></div>
                    <div><div class="details-label">Status</div><div>—</div></div>
                    <div><div class="details-label">Side</div><div>—</div></div>
                    <div><div class="details-label">Qty</div><div class="monospace">—</div></div>
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label" style="margin-bottom:4px;">Price Block</div>
                  <div class="details-grid">
                    <div><div class="details-label">Entry</div><div class="monospace">—</div></div>
                    <div><div class="details-label">Stop</div><div class="monospace">—</div></div>
                    <div><div class="details-label">Target</div><div class="monospace">—</div></div>
                    <div><div class="details-label">PnL</div><div class="monospace">—</div></div>
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label" style="margin-bottom:4px;">Linkage</div>
                  <div class="details-grid">
                    <div><div class="details-label">Signal</div><div class="monospace">—</div></div>
                    <div><div class="details-label">Strategy</div><div>—</div></div>
                    <div><div class="details-label">Session</div><div>—</div></div>
                    <div><div class="details-label">Created</div><div>—</div></div>
                  </div>
                </div>
                <div class="details-section">
                  <div class="details-label" style="margin-bottom:4px;">Notes</div>
                  <div class="monospace" id="ticket-notes">—</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- MARKETS PAGE -->
      <section id="view-markets" class="view-hidden">
        <div class="panel">
          <div class="filter-bar">
            <div class="filter-pill"><span>Symbol</span><strong>ES ▾</strong></div>
            <div class="filter-pill"><span>Timeframe</span><strong>1m ▾</strong></div>
            <div class="filter-pill"><span>Session</span><strong>RTH ▾</strong></div>
            <div class="filter-pill"><span>Overlays</span><strong>VWAP · OR · ATR · Signals</strong></div>
          </div>

          <div class="market-layout">
            <div class="chart-shell">
              <div class="chart-main">
                <svg id="market-chart"></svg>
              </div>
              <div class="chart-legend">
                <div class="legend-row">
                  <span class="legend-item"><span class="legend-dot"></span>VWAP</span>
                  <span class="legend-item"><span class="legend-dot or"></span>OR High/Low</span>
                  <span class="legend-item"><span class="legend-dot atr"></span>ATR Bands</span>
                  <span class="legend-item"><span class="legend-dot signal"></span>Signals</span>
                </div>
                <div style="font-size:10px;color:var(--text-muted);">
                  ES · 1m candles · Synthetic
                </div>
              </div>
            </div>

            <div class="panel">
              <div class="panel-header">
                <h2>Session Metrics & Regime</h2>
                <span style="font-size:10px;color:var(--text-muted);">Synthetic snapshot</span>
              </div>
              <div class="panel-body">
                <div class="details-grid" style="margin-bottom:6px;">
                  <div><div class="details-label">OR Width</div><div class="monospace">12.5</div></div>
                  <div><div class="details-label">OR Mid</div><div class="monospace">4518.25</div></div>
                  <div><div class="details-label">VWAP</div><div class="monospace">4520.79</div></div>
                  <div><div class="details-label">VWAP Slope</div><div class="monospace">+0.32</div></div>
                </div>
                <div class="details-grid">
                  <div><div class="details-label">ATR(14)</div><div class="monospace">6.2</div></div>
                  <div><div class="details-label">Volatility</div><div>High</div></div>
                  <div><div class="details-label">Trend</div><div>Trend Up</div></div>
                  <div><div class="details-label">OR Break</div><div>Above High</div></div>
                </div>
              </div>
            </div>
          </div>

          <div class="panel" style="margin-top:12px;">
            <div class="panel-header">
              <h2>Last Signals · ES</h2>
              <span style="font-size:11px;color:var(--text-muted);">Linked to Worklist / Tickets</span>
            </div>
            <div class="panel-body scroll-y" id="market-signals-container"></div>
          </div>
        </div>
      </section>

      <!-- ANALYTICS PAGE -->
      <section id="view-analytics" class="view-hidden">
        <div class="panel">
          <div class="filter-bar">
            <div class="filter-pill"><span>Symbol</span><strong>ES / NQ / CL ▾</strong></div>
            <div class="filter-pill"><span>Strategy</span><strong>ORR / OSB / VWFT ▾</strong></div>
            <div class="filter-pill"><span>Regime</span><strong>All ▾</strong></div>
            <div class="filter-pill"><span>Window</span><strong>Last 60 sessions ▾</strong></div>
          </div>
          <div class="panel-header">
            <h2>Analytics · Performance & Regime</h2>
            <span style="font-size:11px;color:var(--text-muted);">Diagnostics only · No execution</span>
          </div>

          <div class="panel-body">
            <div class="kpi-row" id="analytics-kpis"></div>

            <div class="two-col-wide" style="margin-top:12px;">
              <div class="chart-shell">
                <div class="chart-main">
                  <svg id="analytics-equity"></svg>
                </div>
                <div class="chart-legend">
                  <div class="legend-row">
                    <span class="legend-item"><span class="legend-dot"></span>Equity (Actioned)</span>
                    <span class="legend-item"><span class="legend-dot signal"></span>Equity (Sim)</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);">Cumulative PnL · Synthetic</div>
                </div>
              </div>

              <div class="chart-shell">
                <div class="chart-main">
                  <svg id="analytics-regimes"></svg>
                </div>
                <div class="chart-legend">
                  <div class="legend-row">
                    <span class="legend-item"><span class="legend-dot"></span>Win % by Regime</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-muted);">ORR · ES · Synthetic</div>
                </div>
              </div>
            </div>

            <div class="panel" style="margin-top:12px;">
              <div class="panel-header">
                <h2>Sessions Table</h2>
                <span style="font-size:10px;color:var(--text-muted);">Best / worst sessions snapshot</span>
              </div>
              <div class="panel-body scroll-y" id="analytics-table-container"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- SYSTEM PAGE -->
      <section id="view-system" class="view-hidden">
        <div class="panel">
          <div class="panel-header">
            <h2>System Health · Data · Workers · Risk</h2>
            <span style="font-size:11px;color:var(--text-muted);">Operational · No execution</span>
          </div>
          <div class="panel-body">
            <div class="health-row" id="system-health-cards"></div>

            <div class="two-col-wide" style="margin-top:12px;">
              <div class="panel">
                <div class="panel-header">
                  <h2>Symbol/Strategy Status</h2>
                  <span style="font-size:10px;color:var(--text-muted);">Processing · Lag · Errors</span>
                </div>
                <div class="panel-body scroll-y" id="system-status-table"></div>
              </div>

              <div class="panel">
                <div class="panel-header">
                  <h2>Logs & Alerts</h2>
                  <span style="font-size:10px;color:var(--text-muted);">Tail of ingest & workers</span>
                </div>
                <div class="panel-body">
                  <div class="log-stream" id="system-log-stream"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- STRATEGY LAB PAGE -->
      <section id="view-lab" class="view-hidden">
        <div class="panel">
          <div class="filter-bar">
            <div class="filter-pill"><span>Strategy</span><strong>ORR ▾</strong></div>
            <div class="filter-pill"><span>Symbol</span><strong>ES ▾</strong></div>
            <div class="filter-pill"><span>Config</span><strong>ORR_ES_D1 ▾</strong></div>
          </div>

          <div class="lab-layout">
            <div class="panel">
              <div class="panel-header">
                <h2>Config Sets</h2>
                <span style="font-size:10px;color:var(--text-muted);">Sim + Prod</span>
              </div>
              <div class="panel-body">
                <div class="config-list" id="config-list"></div>
              </div>
            </div>

            <div class="panel">
              <div class="panel-header">
                <h2>Parameters</h2>
                <span style="font-size:10px;color:var(--text-muted);">Suggestion deltas</span>
              </div>
              <div class="panel-body lab-param-table" id="lab-param-table"></div>
            </div>

            <div class="panel">
              <div class="panel-header">
                <h2>Backtest Impact</h2>
                <span class="badge-soft">Synthetic · 60 sessions</span>
              </div>
              <div class="panel-body">
                <div class="equity-shell"><svg id="equity-chart"></svg></div>
                <div class="metric-grid">
                  <div><div class="metric-label">Win Rate</div><div class="metric-value">62% → 68%</div></div>
                  <div><div class="metric-label">Profit Factor</div><div class="metric-value">1.8 → 2.1</div></div>
                  <div><div class="metric-label">Max DD</div><div class="metric-value">-3.2% → -2.1%</div></div>
                  <div><div class="metric-label">Sharpe</div><div class="metric-value">1.21 → 1.48</div></div>
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
        "nav-worklist": { view: "view-worklist", label: "Worklist (execution)" },
        "nav-tickets":  { view: "view-tickets",  label: "Tickets (audit & history)" },
        "nav-markets":  { view: "view-markets",  label: "Markets (context)" },
        "nav-analytics":{ view: "view-analytics",label: "Analytics (diagnostics)" },
        "nav-system":   { view: "view-system",   label: "System (health & logs)" },
        "nav-lab":      { view: "view-lab",      label: "Strategy Lab (config + backtest)" }
      };

      var worklistRows = [];
      var ticketsRows = [];

      var regimes = ["TrendUp", "TrendDn", "Chop", "OR Breakout"];
      var vwapPos = ["VW+", "VW-", "VW±", "VW++"];
      var orCtx   = ["ORIn", "OROut", "ORMid"];
      var volStates = ["ATR High", "ATR Low", "ATR Mid"];

      function pad2(n) { return (n < 10 ? "0" : "") + n; }

      function buildWorklistData() {
        worklistRows = [];
        for (var i = 0; i < 24; i++) {
          var score = 76 + Math.floor(Math.random() * 24);
          var strengthTrend = (i % 3 === 0) ? "up" : ((i % 3 === 1) ? "flat" : "down");
          var strategy = ["ORR", "OSB", "VWFT"][i % 3];
          var risk = (i % 5 === 0) ? "amber" : "green";
          var contracts = (risk === "amber") ? 1 : 2;
          var entry = 4510 + i * 0.5 + Math.random();
          var stopTicks = -(8 + (i % 3));
          var targetTicks = 2 * Math.abs(stopTicks) + ((i % 2) ? 4 : 0);
          var rr = (targetTicks / Math.abs(stopTicks)).toFixed(1);
          var timeRemaining = 30 - i;
          var lastUpdated = "09:" + pad2(50 - i);
          var trend = (strengthTrend === "up") ? "up" : ((strengthTrend === "down") ? "down" : "sideways");

          var spark = [];
          for (var j = 0; j < 16; j++) {
            spark.push(0.4 + Math.random() * 0.6);
          }

          worklistRows.push({
            id: "wl-" + i,
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
            timeRemainingSecs: timeRemaining * 60,
            sparkline: spark,
            lastUpdated: lastUpdated
          });
        }
      }

      function buildTicketsData() {
        ticketsRows = [];
        var statuses = ["OPEN", "FILLED", "CANCELLED", "EXPIRED"];
        var sides = ["LONG", "SHORT"];
        var syms = ["ES", "NQ", "CL"];
        for (var i = 0; i < 32; i++) {
          var sym = syms[i % syms.length];
          var strat = ["ORR", "OSB", "VWFT"][i % 3];
          var status = statuses[i % statuses.length];
          var side = sides[i % 2];
          var qty = (status === "OPEN" ? 2 : 1 + (i % 3));
          var entry = 4500 + i * 0.75 + Math.random();
          var stop = entry - 6 - (i % 3);
          var target = entry + 10 + (i % 4);
          var pnl = (status === "FILLED")
            ? (Math.random() * 10 - 3).toFixed(1)
            : "0.0";
          var score = 70 + Math.floor(Math.random() * 30);
          var id = "T-" + sym + "-0" + pad2(i);
          var created = "09:" + pad2(10 + i);
          var note = status === "FILLED"
            ? "Filled via " + strat + " signal; matched guardrails."
            : (status === "OPEN"
              ? "Live ticket; waiting for fill."
              : "Closed ticket for review.");
          ticketsRows.push({
            id: id,
            created: created,
            symbol: sym,
            strategy: strat,
            status: status,
            side: side,
            qty: qty,
            entry: entry.toFixed(2),
            stop: stop.toFixed(2),
            target: target.toFixed(2),
            pnl: pnl,
            score: score,
            note: note
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
        return trend === "up" ? "up" :
               trend === "down" ? "down" : "flat";
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

        var rowsHtml = [];
        for (var i = 0; i < worklistRows.length; i++) {
          var row = worklistRows[i];
          rowsHtml.push(
            '<tr data-row-id="' + row.id + '">' +
              '<td class="num monospace">' + row.score + '</td>' +
              '<td><span class="strength ' + strengthClass(row.strengthTrend) + '">' +
                (row.strengthTrend === "up" ? "↑" : (row.strengthTrend === "down" ? "↓" : "→")) +
              '</span></td>' +
              '<td>' + row.strategy + '</td>' +
              '<td><span class="risk-pill ' + riskClass(row.risk) + '">' + row.risk.toUpperCase() + '</span></td>' +
              '<td class="num monospace">' + row.contracts + '</td>' +
              '<td class="num monospace">' + row.entry + '</td>' +
              '<td class="num monospace">' + row.stopTicks + 't</td>' +
              '<td class="num monospace">+' + row.targetTicks + 't</td>' +
              '<td class="num monospace">' + row.rr + '</td>' +
              '<td>' + row.context.regime + ' · ' + row.context.vwapPosition + ' · ' +
                row.context.orContext + ' · ' + row.context.volatility + '</td>' +
              '<td class="trend-arrow ' + trendClass(row.priceTrend) + '">' + trendSymbol(row.priceTrend) + '</td>' +
              '<td class="num monospace">' + Math.max(0, Math.floor(row.timeRemainingSecs / 60)) + 'm</td>' +
              '<td class="spark">' + renderSparkline(row.sparkline) + '</td>' +
              '<td class="num monospace">' + row.lastUpdated + '</td>' +
            '</tr>'
          );
        }

        container.innerHTML = header + rowsHtml.join("") + '</tbody></table>';

        var bodyRows = container.querySelectorAll("tbody tr");
        for (var k = 0; k < bodyRows.length; k++) {
          bodyRows[k].addEventListener("click", function () {
            var id = this.getAttribute("data-row-id");
            var found = null;
            for (var m = 0; m < worklistRows.length; m++) {
              if (worklistRows[m].id === id) {
                found = worklistRows[m];
                break;
              }
            }
            if (found) updateDetailsPanel(found);
          });
        }

        if (worklistRows.length > 0) {
          updateDetailsPanel(worklistRows[0]);
        }
      }

      function updateDetailsPanel(row) {
        var details = $("details-panel");
        if (!details) return;

        var h3 = details.querySelector("h3");
        if (h3) {
          h3.textContent = row.strategy + " · " + row.risk.toUpperCase() + " · Score " + row.score;
        }

        var chips = details.querySelectorAll(".tag-pill");
        if (chips.length > 0) {
          chips[0].textContent = "ES · " + row.strategy + " · " + trendSymbol(row.priceTrend) + " trend";
        }

        var grids = details.querySelectorAll(".details-grid");
        if (grids.length >= 3) {
          var topCells = grids[0].querySelectorAll("div:nth-child(2)");
          if (topCells.length >= 4) {
            topCells[0].innerHTML = row.strategy;
            topCells[1].innerHTML = "ES";
            topCells[2].innerHTML = '<span class="monospace">' + row.score + '</span>';
            topCells[3].innerHTML = '<span class="risk-pill ' + riskClass(row.risk) + '">' + row.risk.toUpperCase() + '</span>';
          }

          var tradeCells = grids[1].querySelectorAll("div:nth-child(2)");
          if (tradeCells.length >= 4) {
            tradeCells[0].innerHTML = '<span class="monospace">' + row.entry + '</span>';
            tradeCells[1].innerHTML = '<span class="monospace">' + row.contracts + '</span>';
            tradeCells[2].innerHTML = '<span class="monospace">' + row.stopTicks + 't / +' + row.targetTicks + 't</span>';
            tradeCells[3].innerHTML = '<span class="monospace">' + row.rr + '</span>';
          }

          var ctxCells = grids[2].querySelectorAll("div:nth-child(2)");
          if (ctxCells.length >= 4) {
            ctxCells[0].textContent = row.context.regime;
            ctxCells[1].textContent = row.context.vwapPosition;
            ctxCells[2].textContent = row.context.orContext;
            ctxCells[3].textContent = row.context.volatility;
          }
        }

        var notes = $("details-notes");
        if (notes) {
          notes.textContent = "Synthetic · " + row.strategy + " · " + row.risk.toUpperCase();
        }
      }

      function renderTicketsTable() {
        var container = $("tickets-table-container");
        if (!container) return;

        var header =
          '<table>' +
          '<thead><tr>' +
          '<th>ID</th>' +
          '<th>Time</th>' +
          '<th>Sym</th>' +
          '<th>Strat</th>' +
          '<th>Side</th>' +
          '<th>Qty</th>' +
          '<th>Entry</th>' +
          '<th>Stop</th>' +
          '<th>Target</th>' +
          '<th>Status</th>' +
          '<th>PnL</th>' +
          '<th>Score</th>' +
          '</tr></thead><tbody>';

        var rowsHtml = [];
        for (var i = 0; i < ticketsRows.length; i++) {
          var t = ticketsRows[i];
          var cls = t.status === "FILLED" ? "risk-green" :
                    (t.status === "OPEN" ? "risk-amber" : "risk-red");
          rowsHtml.push(
            '<tr data-ticket-id="' + t.id + '">' +
              '<td class="monospace">' + t.id + '</td>' +
              '<td class="num monospace">' + t.created + '</td>' +
              '<td>' + t.symbol + '</td>' +
              '<td>' + t.strategy + '</td>' +
              '<td>' + t.side + '</td>' +
              '<td class="num monospace">' + t.qty + '</td>' +
              '<td class="num monospace">' + t.entry + '</td>' +
              '<td class="num monospace">' + t.stop + '</td>' +
              '<td class="num monospace">' + t.target + '</td>' +
              '<td><span class="risk-pill ' + cls + '">' + t.status + '</span></td>' +
              '<td class="num monospace">' + t.pnl + '</td>' +
              '<td class="num monospace">' + t.score + '</td>' +
            '</tr>'
          );
        }

        container.innerHTML = header + rowsHtml.join("") + '</tbody></table>';

        var rows = container.querySelectorAll("tbody tr");
        for (var j = 0; j < rows.length; j++) {
          rows[j].addEventListener("click", function () {
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
        var panel = $("ticket-details-panel");
        if (!panel) return;
        var h3 = panel.querySelector("h3");
        if (h3) h3.textContent = t.id + " · " + t.status;

        var chips = panel.querySelectorAll(".tag-pill");
        if (chips.length > 0) {
          chips[0].textContent = t.symbol + " · " + t.strategy + " · " + t.side;
        }

        var grids = panel.querySelectorAll(".details-grid");
        if (grids.length >= 3) {
          var topCells = grids[0].querySelectorAll("div:nth-child(2)");
          if (topCells.length >= 4) {
            topCells[0].innerHTML = '<span class="monospace">' + t.id + '</span>';
            topCells[1].innerHTML = t.status;
            topCells[2].innerHTML = t.side;
            topCells[3].innerHTML = '<span class="monospace">' + t.qty + '</span>';
          }

          var priceCells = grids[1].querySelectorAll("div:nth-child(2)");
          if (priceCells.length >= 4) {
            priceCells[0].innerHTML = '<span class="monospace">' + t.entry + '</span>';
            priceCells[1].innerHTML = '<span class="monospace">' + t.stop + '</span>';
            priceCells[2].innerHTML = '<span class="monospace">' + t.target + '</span>';
            priceCells[3].innerHTML = '<span class="monospace">' + t.pnl + '</span>';
          }

          var linkCells = grids[2].querySelectorAll("div:nth-child(2)");
          if (linkCells.length >= 4) {
            linkCells[0].innerHTML = '<span class="monospace">' + t.id.replace("T-", "S-") + '</span>';
            linkCells[1].innerHTML = t.strategy;
            linkCells[2].innerHTML = "RTH · Sim";
            linkCells[3].innerHTML = "09:" + pad2(10 + Math.floor(Math.random() * 40));
          }
        }

        var notes = $("ticket-notes");
        if (notes) notes.textContent = t.note;
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
          var change = (Math.random() - 0.4) * 6;
          var close = open + change;
          var high = Math.max(open, close) + 3 * Math.random();
          var low = Math.min(open, close) - 3 * Math.random();
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

        function scaleY(val) {
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
          var yHigh = scaleY(cnd.high);
          var yLow = scaleY(cnd.low);
          var yOpen = scaleY(cnd.open);
          var yClose = scaleY(cnd.close);
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

          var yV = scaleY(vwapVal);
          var yU = scaleY(upper);
          var yL = scaleY(lower);

          pathVwap += (idx === 0 ? "M" : "L") + cx + " " + yV + " ";
          pathUpper += (idx === 0 ? "M" : "L") + cx + " " + yU + " ";
          pathLower += (idx === 0 ? "M" : "L") + cx + " " + yL + " ";
        }

        function makePath(d, stroke, width, dashArray, opacity) {
          var pth = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pth.setAttribute("d", d);
          pth.setAttribute("fill", "none");
          pth.setAttribute("stroke", stroke);
          pth.setAttribute("stroke-width", width);
          if (dashArray) pth.setAttribute("stroke-dasharray", dashArray);
          if (opacity) pth.setAttribute("stroke-opacity", opacity);
          pth.setAttribute("stroke-linecap", "round");
          pth.setAttribute("stroke-linejoin", "round");
          svg.appendChild(pth);
        }

        makePath(pathUpper, "#ffc466", 1, "4 4", 0.9);
        makePath(pathLower, "#ffc466", 1, "4 4", 0.9);
        makePath(pathVwap, "#42e2f4", 1.4, null, 1.0);
      }

      function renderMarketSignals() {
        var container = $("market-signals-container");
        if (!container) return;
        var rows = [];
        var count = Math.min(10, worklistRows.length);
        for (var i = 0; i < count; i++) {
          var row = worklistRows[i];
          var t = "09:" + pad2(40 + Math.floor(Math.random() * 20));
          rows.push(
            "<tr>" +
              '<td class="num monospace">' + t + "</td>" +
              "<td>" + row.strategy + "</td>" +
              '<td class="num monospace">' + row.score + "</td>" +
              '<td><span class="risk-pill ' + riskClass(row.risk) + '">' + row.risk.toUpperCase() + "</span></td>" +
              '<td class="num monospace">' + row.entry + "</td>" +
              '<td class="num monospace">' + row.stopTicks + "t</td>" +
              '<td class="num monospace">+' + row.targetTicks + "t</td>" +
              "<td>" + row.context.regime + "</td>" +
              '<td class="trend-arrow ' + trendClass(row.priceTrend) + '">' + trendSymbol(row.priceTrend) + "</td>" +
            "</tr>"
          );
        }

        container.innerHTML =
          "<table>" +
            "<thead><tr>" +
              "<th>Time</th>" +
              "<th>Strat</th>" +
              "<th>Score</th>" +
              "<th>Risk</th>" +
              "<th>Entry</th>" +
              "<th>Stop</th>" +
              "<th>Target</th>" +
              "<th>Context</th>" +
              "<th>Trend</th>" +
            "</tr></thead>" +
            "<tbody>" + rows.join("") + "</tbody>" +
          "</table>";
      }

      var configs = [
        { id: "ORR_ES_D1",   label: "ORR_ES_D1",   status: "Active · 3 pending", env: "Sim" },
        { id: "ORR_ES_15m",  label: "ORR_ES_15m",  status: "Backtest-ready",     env: "Sim" },
        { id: "ORR_NQ_D1",   label: "ORR_NQ_D1",   status: "Prod-compatible",    env: "Prod" },
        { id: "OSB_ES_15m",  label: "OSB_ES_15m",  status: "5 suggestions",      env: "Sim" }
      ];

      var paramRows = [
        { name: "rrBandMin",   current: 1.3,    suggested: 1.5,  impact: "More selective",      type: "risk"    },
        { name: "rrBandMax",   current: 2.3,    suggested: 2.1,  impact: "Slightly lower RR",   type: "neutral" },
        { name: "stopTicks",   current: 8,      suggested: 10,   impact: "Safer · lower DD",    type: "risk"    },
        { name: "atrFactor",   current: 1.0,    suggested: 1.2,  impact: "Better vol fit",      type: "good"    },
        { name: "maxContracts",current: 2,      suggested: 2,    impact: "Guardrails intact",   type: "neutral" }
      ];

      function renderConfigList() {
        var list = $("config-list");
        if (!list) return;
        var html = [];
        for (var i = 0; i < configs.length; i++) {
          var cfg = configs[i];
          var active = (i === 0) ? " active" : "";
          var right = (i === 0)
            ? '<span class="suggestion-pill">[!] 3 pending fields</span>'
            : '<span class="badge-soft">Open</span>';
          html.push(
            '<div class="config-row' + active + '" data-id="' + cfg.id + '">' +
              '<div>' +
                '<span class="name">' + cfg.label + '</span><br>' +
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
        html.push('<th>Param</th><th>Current</th><th>Suggested</th><th>Impact</th><th>ℹ︎</th>');
        html.push('</tr></thead><tbody>');

        for (var i = 0; i < paramRows.length; i++) {
          var row = paramRows[i];
          var impactClass = (row.type === "good") ? "good" :
                            (row.type === "risk") ? "risk" : "neutral";
          html.push(
            "<tr>" +
              "<td>" + row.name + "</td>" +
              '<td class="num monospace">' + row.current + "</td>" +
              '<td class="num monospace">' + row.suggested + "</td>" +
              '<td><span class="impact-chip ' + impactClass + '">' + row.impact + "</span></td>" +
              '<td class="num monospace">?</td>' +
            "</tr>"
          );
        }

        html.push("</tbody></table>");
        container.innerHTML = html.join("");
      }

      function drawEquityCurve() {
        var svg = $("equity-chart");
        if (!svg) return;
        var width = 420;
        var height = 150;
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);

        var pointsA = [];
        var pointsB = [];
        var vA = 0;
        var vB = 0;
        for (var i = 0; i < 40; i++) {
          vA += (Math.random() - 0.4) * 1.2;
          vB += (Math.random() - 0.35) * 1.4;
          pointsA.push(vA);
          pointsB.push(vB);
        }
        var allVals = pointsA.concat(pointsB);
        var minV = Math.min.apply(null, allVals) - 1;
        var maxV = Math.max.apply(null, allVals) + 1;

        function scaleY(val) {
          return height - ((val - minV) / (maxV - minV)) * (height - 16) - 8;
        }

        var stepX = (width - 20) / (pointsA.length - 1);

        function buildPath(arr) {
          var d = "";
          for (var i = 0; i < arr.length; i++) {
            var x = 10 + i * stepX;
            var y = scaleY(arr[i]);
            d += (i === 0 ? "M" : "L") + x + " " + y + " ";
          }
          return d;
        }

        var pathBase = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathBase.setAttribute("d", buildPath(pointsA));
        pathBase.setAttribute("fill", "none");
        pathBase.setAttribute("stroke", "rgba(148, 163, 255, 0.7)");
        pathBase.setAttribute("stroke-width", "1.3");
        pathBase.setAttribute("stroke-linecap", "round");
        pathBase.setAttribute("stroke-linejoin", "round");
        svg.appendChild(pathBase);

        var pathNew = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathNew.setAttribute("d", buildPath(pointsB));
        pathNew.setAttribute("fill", "none");
        pathNew.setAttribute("stroke", "#4be8a3");
        pathNew.setAttribute("stroke-width", "1.5");
        pathNew.setAttribute("stroke-linecap", "round");
        pathNew.setAttribute("stroke-linejoin", "round");
        svg.appendChild(pathNew);
      }

      function renderAnalyticsKpis() {
        var container = $("analytics-kpis");
        if (!container) return;
        container.innerHTML =
          '<div class="kpi-card">' +
            '<div class="kpi-label">Total Tickets</div>' +
            '<div class="kpi-value">1,248</div>' +
            '<div class="kpi-delta good">+8.2% vs prior 60d</div>' +
          '</div>' +
          '<div class="kpi-card">' +
            '<div class="kpi-label">Win Rate (Actioned)</div>' +
            '<div class="kpi-value">64.1%</div>' +
            '<div class="kpi-delta good">+3.4 pts</div>' +
          '</div>' +
          '<div class="kpi-card">' +
            '<div class="kpi-label">Avg Score (Actioned)</div>' +
            '<div class="kpi-value">84.7</div>' +
            '<div class="kpi-delta good">Tighter dispersion</div>' +
          '</div>' +
          '<div class="kpi-card">' +
            '<div class="kpi-label">Max Drawdown (Sim)</div>' +
            '<div class="kpi-value">-5.3%</div>' +
            '<div class="kpi-delta bad">-0.7 pts vs baseline</div>' +
          '</div>';
      }

      function drawAnalyticsEquity() {
        var svg = $("analytics-equity");
        if (!svg) return;
        var width = 600;
        var height = 260;
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);

        var pointsBase = [];
        var pointsNew = [];
        var base = 0;
        var neu = 0;
        for (var i = 0; i < 60; i++) {
          base += (Math.random() - 0.45) * 0.9;
          neu  += (Math.random() - 0.4)  * 1.1;
          pointsBase.push(base);
          pointsNew.push(neu);
        }
        var allVals = pointsBase.concat(pointsNew);
        var minV = Math.min.apply(null, allVals) - 1;
        var maxV = Math.max.apply(null, allVals) + 1;

        function scaleY(val) {
          return height - ((val - minV) / (maxV - minV)) * (height - 20) - 10;
        }

        var stepX = (width - 40) / (pointsBase.length - 1);

        function buildPath(arr) {
          var d = "";
          for (var i = 0; i < arr.length; i++) {
            var x = 20 + i * stepX;
            var y = scaleY(arr[i]);
            d += (i === 0 ? "M" : "L") + x + " " + y + " ";
          }
          return d;
        }

        var pBase = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pBase.setAttribute("d", buildPath(pointsBase));
        pBase.setAttribute("fill", "none");
        pBase.setAttribute("stroke", "rgba(148, 163, 255, 0.7)");
        pBase.setAttribute("stroke-width", "1.2");
        pBase.setAttribute("stroke-linecap", "round");
        pBase.setAttribute("stroke-linejoin", "round");
        svg.appendChild(pBase);

        var pNew = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pNew.setAttribute("d", buildPath(pointsNew));
        pNew.setAttribute("fill", "none");
        pNew.setAttribute("stroke", "#4be8a3");
        pNew.setAttribute("stroke-width", "1.4");
        pNew.setAttribute("stroke-linecap", "round");
        pNew.setAttribute("stroke-linejoin", "round");
        svg.appendChild(pNew);
      }

      function drawAnalyticsRegimes() {
        var svg = $("analytics-regimes");
        if (!svg) return;
        var width = 600;
        var height = 260;
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);

        var regimesData = [
          { name: "TrendUp", win: 0.71 },
          { name: "TrendDn", win: 0.61 },
          { name: "Chop",    win: 0.52 },
          { name: "OR Break",win: 0.66 }
        ];

        var maxWin = 0.8;
        var barWidth = (width - 80) / regimesData.length;
        for (var i = 0; i < regimesData.length; i++) {
          var r = regimesData[i];
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
          label.setAttribute("fill", "#e5ecff");
          label.setAttribute("font-size", "11");
          svg.appendChild(label);

          var name = document.createElementNS("http://www.w3.org/2000/svg", "text");
          name.textContent = r.name;
          name.setAttribute("x", x + barWidth * 0.35);
          name.setAttribute("y", height - 14);
          name.setAttribute("text-anchor", "middle");
          name.setAttribute("fill", "#9ca7ce");
          name.setAttribute("font-size", "10");
          svg.appendChild(name);
        }
      }

      function renderAnalyticsTable() {
        var container = $("analytics-table-container");
        if (!container) return;

        var rows = [];
        for (var i = 0; i < 18; i++) {
          var day = 60 - i;
          var label = "Session " + day;
          var pnl = (Math.random() * 4 - 1.5).toFixed(2);
          var winRate = (50 + Math.random() * 20).toFixed(1);
          var regime = regimes[i % regimes.length];
          var vol = volStates[i % volStates.length];
          var flag = Math.abs(pnl) > 2.5 ? "Drift" : "";
          rows.push(
            "<tr>" +
              "<td>" + label + "</td>" +
              "<td>" + regime + "</td>" +
              "<td>" + vol + "</td>" +
              '<td class="num monospace">' + pnl + "%</td>" +
              '<td class="num monospace">' + winRate + "%</td>" +
              "<td>" + flag + "</td>" +
            "</tr>"
          );
        }

        container.innerHTML =
          "<table>" +
            "<thead><tr>" +
              "<th>Session</th>" +
              "<th>Regime</th>" +
              "<th>Vol</th>" +
              "<th>PnL</th>" +
              "<th>Win%</th>" +
              "<th>Flag</th>" +
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
            '<div class="health-line">• Burst: 120 rps</div>' +
          '</div>' +
          '<div class="health-card">' +
            '<div class="health-title">DB / Storage</div>' +
            '<div class="health-line">• OK</div>' +
            '<div class="health-line">• Lag: 0.0s</div>' +
            '<div class="health-line">• Conn: 24 / 200</div>' +
          '</div>' +
          '<div class="health-card">' +
            '<div class="health-title">Strategy Engine</div>' +
            '<div class="health-line">• All workers up</div>' +
            '<div class="health-line">• Last tick: 0.3s</div>' +
            '<div class="health-line">• Lag: 0.1s</div>' +
          '</div>' +
          '<div class="health-card">' +
            '<div class="health-title">Risk Engine</div>' +
            '<div class="health-line">• Hard-stop: ON</div>' +
            '<div class="health-line">• Alerts: 0</div>' +
            '<div class="health-line">• Max DD: 4.8%</div>' +
          '</div>';
      }

      function renderSystemStatusTable() {
        var container = $("system-status-table");
        if (!container) return;

        var rows = [];
        var syms = ["ES", "NQ", "CL", "GC", "6E"];
        var strats = ["ORR", "OSB", "VWFT"];
        for (var i = 0; i < 18; i++) {
          var sym = syms[i % syms.length];
          var strat = strats[i % strats.length];
          var lag = (Math.random() * 0.8).toFixed(2);
          var qps = (2 + Math.random() * 5).toFixed(1);
          var err = Math.random() < 0.15 ? "WARN" : "OK";
          rows.push(
            "<tr>" +
              "<td>" + sym + "</td>" +
              "<td>" + strat + "</td>" +
              '<td class="num monospace">' + lag + "s</td>" +
              '<td class="num monospace">' + qps + "</td>" +
              "<td>" + err + "</td>" +
            "</tr>"
          );
        }

        container.innerHTML =
          "<table>" +
            "<thead><tr>" +
              "<th>Sym</th>" +
              "<th>Strat</th>" +
              "<th>Lag</th>" +
              "<th>QPS</th>" +
              "<th>Status</th>" +
            "</tr></thead>" +
            "<tbody>" + rows.join("") + "</tbody>" +
          "</table>";
      }

      function renderSystemLogs() {
        var container = $("system-log-stream");
        if (!container) return;
        var lines = [];
        var levels = ["ok", "warn", "error"];
        for (var i = 0; i < 22; i++) {
          var lvl = levels[Math.random() < 0.75 ? 0 : (Math.random() < 0.5 ? 1 : 2)];
          var ts = "09:" + pad2(10 + i) + ":0" + (i % 10);
          var msg;
          if (lvl === "ok") {
            msg = ts + " [INGRESS] ES tick batch applied (rows=" + (900 + i) + ")";
          } else if (lvl === "warn") {
            msg = ts + " [WORKER] NQ_ORR worker lag=0.9s (throttle in effect)";
          } else {
            msg = ts + " [RISK] Hard-stop hit for CL (sim margin breach)";
          }
          lines.push('<div class="log-line ' + lvl + '">' + msg + '</div>');
        }
        container.innerHTML = lines.join("");
      }

      function initNav() {
        var id;
        for (id in viewMap) {
          if (!viewMap.hasOwnProperty(id)) continue;
          (function (navId) {
            var btn = $(navId);
            if (!btn) return;
            btn.addEventListener("click", function () {
              var key;
              for (key in viewMap) {
                if (!viewMap.hasOwnProperty(key)) continue;
                var b = $(key);
                var v = $(viewMap[key].view);
                if (b) b.classList.toggle("active", key === navId);
                if (v) v.classList.toggle("view-hidden", key !== navId);
              }
              var lbl = $("view-label");
              if (lbl) lbl.textContent = viewMap[navId].label;
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
        renderConfigList();
        renderParamTable();
        drawEquityCurve();
        renderAnalyticsKpis();
        drawAnalyticsEquity();
        drawAnalyticsRegimes();
        renderAnalyticsTable();
        renderSystemHealth();
        renderSystemStatusTable();
        renderSystemLogs();
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

# === server.js ===
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
  console.log("=== Prism Apex FULL A2 mock (Worklist/Tickets/Markets/Analytics/System/Lab) running at http://localhost:" + PORT + " ===");
});
JS

echo "=== PRISM APEX — GENERATING FULL A2 MOCK (PORT 3200, NO NPM) ==="
node server.js
