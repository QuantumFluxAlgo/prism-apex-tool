#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX — GENERATING WORKLIST + MARKET A2 MOCK (PORT 3200, NO NPM) ==="

cat > index.html << 'EON'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Prism Apex – Worklist & Market (A2 Theme Mock)</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      /* A2 – Ultra-Modern Fintech Glow */
      --bg-shell: #05060A;
      --bg-page: radial-gradient(circle at top left, #101522 0, #05060A 38%, #020309 100%);
      --bg-panel: #0E1117;
      --bg-elevated: #171B24;
      --bg-header: #171B24;

      --border-subtle: rgba(255,255,255,0.04);
      --border-strong: rgba(255,255,255,0.12);

      --text-primary: #EDF2FF;
      --text-secondary: #A8B2C3;
      --text-muted: #6B7280;

      --accent-primary: #42E2F4;
      --accent-primary-soft: rgba(66,226,244,0.16);
      --accent-secondary: #A855F7;

      --accent-positive: #4BE8A3;
      --accent-positive-soft: rgba(75,232,163,0.15);
      --accent-warning: #FBBF24;
      --accent-warning-soft: rgba(251,191,36,0.18);
      --accent-danger: #F97373;
      --accent-danger-soft: rgba(249,115,115,0.18);

      --row-hover: rgba(255,255,255,0.03);
      --row-active: rgba(66,226,244,0.12);

      --shadow-soft: 0 0 0 1px rgba(255,255,255,0.03);
      --shadow-glow-soft: 0 0 0 1px rgba(66,226,244,0.35),
                          0 0 20px rgba(66,226,244,0.32);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Space Grotesk", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-page);
      color: var(--text-primary);
    }

    .page {
      max-width: 1280px;
      margin: 0 auto;
      padding: 20px 24px 40px;
    }

    .shell {
      border-radius: 18px;
      border: 1px solid var(--border-strong);
      background:
        radial-gradient(circle at top, rgba(66,226,244,0.18), transparent 60%),
        radial-gradient(circle at bottom right, rgba(168,85,247,0.28), transparent 60%),
        linear-gradient(to bottom, rgba(15,23,42,0.92), rgba(2,6,23,0.98));
      box-shadow: 0 24px 70px rgba(0,0,0,0.85);
      overflow: hidden;
    }

    .shell-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-subtle);
      background: linear-gradient(to right, rgba(2,6,23,0.8), rgba(15,23,42,0.95));
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .app-title {
      font-size: 14px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .app-subtitle {
      font-size: 12px;
      color: var(--text-muted);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .pill {
      font-size: 11px;
      border-radius: 999px;
      padding: 3px 8px;
      border: 1px solid var(--border-subtle);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(0,0,0,0.45);
      color: var(--text-muted);
    }

    .pill-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--accent-primary);
      box-shadow: 0 0 10px rgba(66,226,244,0.9);
    }

    .view-toggle-group {
      display: inline-flex;
      padding: 2px;
      border-radius: 999px;
      border: 1px solid var(--border-subtle);
      background: rgba(0,0,0,0.5);
    }

    .view-toggle {
      border: none;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
    }

    .view-toggle.is-active {
      background: linear-gradient(to right, var(--accent-primary), var(--accent-secondary));
      color: #020617;
      box-shadow: 0 0 0 1px rgba(15,23,42,0.8);
    }

    .shell-body {
      padding: 14px 16px 16px;
      background:
        radial-gradient(circle at top left, rgba(66,226,244,0.12), transparent 60%),
        radial-gradient(circle at bottom right, rgba(15,23,42,0.9), rgba(2,6,23,0.98));
    }

    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 10px;
      gap: 8px;
      flex-wrap: wrap;
    }

    .meta-bar strong {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .view {
      display: none;
    }

    .view.is-active {
      display: block;
    }

    .section-title {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    /* WORKLIST VIEW */
    .worklist-card {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: linear-gradient(to bottom, rgba(15,23,42,0.88), rgba(2,6,23,0.96));
      box-shadow: var(--shadow-soft);
      overflow: hidden;
    }

    .worklist-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-header);
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
    }

    .badge-live {
      border-color: rgba(34,197,94,0.6);
      color: var(--accent-positive);
      background: rgba(15,23,42,0.85);
    }

    .worklist-header-left {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .worklist-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 10px;
      justify-content: flex-end;
    }

    .chip {
      border-radius: 999px;
      padding: 3px 7px;
      border: 1px solid rgba(124,135,151,0.40);
      background: rgba(124,135,151,0.16);
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--accent-primary);
    }

    .chip-muted {
      background: rgba(15,23,42,0.85);
      border-color: var(--border-subtle);
      color: var(--text-muted);
    }

    .chip-muted .chip-dot {
      background: var(--border-subtle);
    }

    .chip-score {
      border-color: rgba(66,226,244,0.55);
      background: var(--accent-primary-soft);
      color: var(--accent-primary);
    }

    .chip-risk-green {
      border-color: rgba(75,232,163,0.55);
      background: var(--accent-positive-soft);
      color: var(--accent-positive);
    }

    .chip-risk-amber {
      border-color: rgba(251,191,36,0.55);
      background: var(--accent-warning-soft);
      color: var(--accent-warning);
    }

    .worklist-table-wrap {
      overflow-x: auto;
    }

    .worklist-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    .worklist-table thead {
      background: rgba(15,23,42,0.96);
    }

    .worklist-table th,
    .worklist-table td {
      padding: 5px 8px;
      border-bottom: 1px solid rgba(15,23,42,0.9);
      white-space: nowrap;
    }

    .worklist-table th {
      font-size: 10px;
      text-align: left;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .worklist-table tbody tr {
      background: linear-gradient(to right, rgba(15,23,42,0.96), rgba(15,23,42,0.92));
      transition: background 120ms ease, box-shadow 120ms ease, transform 80ms ease;
      position: relative;
    }

    .worklist-table tbody tr::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background: transparent;
      opacity: 0;
      transition: opacity 120ms ease, background 120ms ease;
    }

    .worklist-table tbody tr:hover {
      background: linear-gradient(to right, var(--row-hover), rgba(15,23,42,0.94));
    }

    .worklist-table tbody tr:hover::before {
      opacity: 1;
      background: linear-gradient(to bottom, var(--accent-primary), var(--accent-secondary));
    }

    .worklist-row-active {
      background: linear-gradient(to right, var(--row-active), rgba(15,23,42,0.98)) !important;
      box-shadow: var(--shadow-glow-soft);
      transform: translateY(-0.5px);
    }

    .worklist-row-active::before {
      opacity: 1;
      width: 3px;
      background: linear-gradient(to bottom, var(--accent-primary), var(--accent-secondary));
    }

    .trend-up {
      color: var(--accent-positive);
      font-size: 11px;
    }

    .trend-flat {
      color: var(--text-muted);
      font-size: 11px;
    }

    .trend-down {
      color: var(--accent-danger);
      font-size: 11px;
    }

    .sparkline {
      height: 18px;
      width: 60px;
      border-radius: 999px;
      background: radial-gradient(circle at 10% 0, rgba(66,226,244,0.5), transparent 55%),
                  radial-gradient(circle at 90% 100%, rgba(168,85,247,0.85), transparent 55%),
                  rgba(15,23,42,0.9);
      position: relative;
      overflow: hidden;
    }

    .sparkline::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(to right, rgba(15,23,42,0.6), transparent 45%, rgba(15,23,42,0.8));
      opacity: 0.7;
    }

    /* MARKET VIEW */
    .market-layout {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1.1fr);
      gap: 12px;
    }

    @media (max-width: 960px) {
      .market-layout {
        grid-template-columns: minmax(0,1fr);
      }
    }

    .market-card {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: linear-gradient(to bottom, rgba(15,23,42,0.94), rgba(2,6,23,0.98));
      box-shadow: var(--shadow-soft);
      padding: 8px 9px 9px;
    }

    .market-top-controls {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: linear-gradient(to right, rgba(15,23,42,0.96), rgba(15,23,42,0.92));
      padding: 7px 9px;
      margin-bottom: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      justify-content: space-between;
    }

    .control-left,
    .control-right {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .control-pill {
      font-size: 11px;
      border-radius: 999px;
      padding: 3px 8px;
      border: 1px solid var(--border-subtle);
      background: rgba(2,6,23,0.9);
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .control-pill-strong {
      border-color: rgba(66,226,244,0.55);
      background: var(--accent-primary-soft);
      color: var(--accent-primary);
    }

    .toggle-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--accent-primary);
      box-shadow: 0 0 10px rgba(66,226,244,0.9);
    }

    .market-main-chart {
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
      background:
        radial-gradient(circle at 10% 0, rgba(66,226,244,0.36), transparent 65%),
        radial-gradient(circle at 100% 100%, rgba(168,85,247,0.32), transparent 60%),
        linear-gradient(to top, #020617, #020617);
      height: 240px;
      position: relative;
      overflow: hidden;
    }

    .market-main-chart::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(to right, rgba(15,23,42,0.85), transparent 18%, transparent 82%, rgba(15,23,42,0.9)),
        linear-gradient(to top, rgba(15,23,42,0.75), transparent 40%);
      opacity: 0.95;
    }

    .market-chart-label {
      position: absolute;
      top: 8px;
      left: 10px;
      font-size: 11px;
      color: var(--text-secondary);
      z-index: 2;
    }

    .market-chart-legend {
      position: absolute;
      top: 8px;
      right: 10px;
      display: inline-flex;
      gap: 6px;
      font-size: 10px;
      z-index: 2;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 999px;
      background: rgba(2,6,23,0.85);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .legend-swatch {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--accent-primary);
    }

    .legend-swatch-or {
      background: var(--accent-secondary);
    }

    .legend-swatch-atr {
      background: var(--accent-warning);
    }

    .market-context-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0,1fr));
      gap: 6px;
      margin-top: 8px;
    }

    @media (max-width: 640px) {
      .market-context-grid {
        grid-template-columns: minmax(0,1fr);
      }
    }

    .context-card {
      border-radius: 9px;
      border: 1px solid var(--border-strong);
      background: rgba(2,6,23,0.96);
      padding: 6px 7px;
      box-shadow: var(--shadow-soft);
    }

    .context-title {
      font-size: 11px;
      color: var(--text-secondary);
      margin-bottom: 3px;
    }

    .context-line {
      font-size: 10px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      gap: 4px;
    }

    .context-value {
      color: var(--text-secondary);
      font-family: "IBM Plex Mono", ui-monospace, monospace;
    }

    .market-signals-card {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: linear-gradient(to right, rgba(15,23,42,0.96), rgba(2,6,23,0.96));
      box-shadow: var(--shadow-soft);
      padding: 7px 9px 8px;
      margin-top: 10px;
    }

    .mini-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
    }

    .mini-table th,
    .mini-table td {
      padding: 4px 6px;
      border-bottom: 1px solid rgba(15,23,42,0.95);
      white-space: nowrap;
    }

    .mini-table th {
      text-align: left;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .mini-row {
      background: rgba(2,6,23,0.96);
    }

    .mini-row:nth-child(even) {
      background: rgba(15,23,42,0.96);
    }

    .risk-pill {
      border-radius: 999px;
      padding: 1px 5px 2px;
      border: 1px solid rgba(75,232,163,0.55);
      background: var(--accent-positive-soft);
      color: var(--accent-positive);
      font-size: 9px;
    }

    .risk-pill-amber {
      border-color: rgba(251,191,36,0.55);
      background: var(--accent-warning-soft);
      color: var(--accent-warning);
    }

    .status-pill {
      border-radius: 999px;
      padding: 1px 5px 2px;
      border: 1px solid rgba(66,226,244,0.55);
      background: var(--accent-primary-soft);
      color: var(--accent-primary);
      font-size: 9px;
    }

    @media (max-width: 720px) {
      .shell-header {
        align-items: flex-start;
      }
    }

  </style>
</head>
<body>
<div class="page">
  <div class="shell">
    <header class="shell-header">
      <div class="header-left">
        <div class="app-title">PRISM APEX – EXECUTION & CONTEXT</div>
        <div class="app-subtitle">Worklist and Market views · A2 visual treatment only.</div>
      </div>
      <div class="header-right">
        <div class="pill">
          <span class="pill-dot"></span>
          <span>A2 · Ultra-Modern Fintech Glow</span>
        </div>
        <div class="view-toggle-group">
          <button class="view-toggle is-active" data-view="worklist">Worklist</button>
          <button class="view-toggle" data-view="market">Market</button>
        </div>
      </div>
    </header>

    <main class="shell-body">
      <div class="meta-bar">
        <span>Strategy set: <strong>ORR / OSB / VWAP-FT</strong> · Symbols: <strong>ES / NQ</strong></span>
        <span>Viewing: <strong id="view-label">Worklist (tickets before action)</strong></span>
      </div>

      <!-- WORKLIST VIEW -->
      <section id="view-worklist" class="view is-active">
        <div class="section-title">Worklist · Pre-Trade Tickets</div>
        <div class="worklist-card">
          <div class="worklist-header">
            <div class="worklist-header-left">
              <span class="badge badge-live">SIM SESSION</span>
              <span style="font-size:11px;color:var(--text-secondary);">ES / NQ · ORR / OSB / VWAP-FT</span>
            </div>
            <div class="worklist-filters">
              <span class="chip chip-score">
                <span class="chip-dot"></span>
                Score ≥ 85
              </span>
              <span class="chip chip-risk-green">
                <span class="chip-dot"></span>
                Risk: Green
              </span>
              <span class="chip chip-muted">
                <span class="chip-dot"></span>
                ≤ 30m Age
              </span>
            </div>
          </div>
          <div class="worklist-table-wrap">
            <table class="worklist-table">
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Str</th>
                  <th>Strat</th>
                  <th>Risk</th>
                  <th>Cnt</th>
                  <th>Entry</th>
                  <th>Stop</th>
                  <th>Target</th>
                  <th>R:R</th>
                  <th>Regime / VWAP / OR</th>
                  <th>Trend</th>
                  <th>Timer</th>
                  <th>Spark</th>
                </tr>
              </thead>
              <tbody>
                <tr class="worklist-row-active">
                  <td>94</td>
                  <td class="trend-up">↑</td>
                  <td>ORR</td>
                  <td><span class="chip chip-risk-green">G</span></td>
                  <td>2</td>
                  <td>4522.50</td>
                  <td>-8t</td>
                  <td>+16t</td>
                  <td>2.0</td>
                  <td style="font-size:10px;color:var(--text-secondary);">
                    TrendUp · VWAP+ · OR Out
                  </td>
                  <td class="trend-up">↗</td>
                  <td style="color:var(--accent-warning);">28m</td>
                  <td><div class="sparkline"></div></td>
                </tr>
                <tr>
                  <td>90</td>
                  <td class="trend-flat">→</td>
                  <td>VWFT</td>
                  <td><span class="chip chip-risk-green">G</span></td>
                  <td>1</td>
                  <td>15308.00</td>
                  <td>-10t</td>
                  <td>+21t</td>
                  <td>2.1</td>
                  <td style="font-size:10px;color:var(--text-secondary);">
                    Chop · VWAP- · OR In
                  </td>
                  <td class="trend-flat">↔</td>
                  <td>17m</td>
                  <td><div class="sparkline"></div></td>
                </tr>
                <tr>
                  <td>85</td>
                  <td class="trend-down">↓</td>
                  <td>OSB</td>
                  <td><span class="chip chip-risk-amber">A</span></td>
                  <td>1</td>
                  <td>987.80</td>
                  <td>-6t</td>
                  <td>+12t</td>
                  <td>1.9</td>
                  <td style="font-size:10px;color:var(--text-secondary);">
                    TrendDn · VWAP+ · OR Out
                  </td>
                  <td class="trend-down">↘</td>
                  <td>12m</td>
                  <td><div class="sparkline"></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- MARKET VIEW -->
      <section id="view-market" class="view">
        <div class="section-title">Market · Context Around Signals</div>

        <div class="market-top-controls">
          <div class="control-left">
            <div class="control-pill control-pill-strong">
              <span class="toggle-dot"></span>
              <span>ES · 1m</span>
            </div>
            <div class="control-pill">
              <span>Session ▾</span>
              <span style="color:var(--text-secondary);">RTH</span>
            </div>
            <div class="control-pill">
              <span>Overlays ▾</span>
              <span style="color:var(--text-secondary);">VWAP · OR · ATR · Signals</span>
            </div>
          </div>
          <div class="control-right">
            <div class="control-pill">
              <span>Compare</span>
              <span style="color:var(--text-secondary);">NQ</span>
            </div>
            <div class="control-pill">
              <span>Scrub</span>
              <span style="color:var(--text-secondary);">09:45 → 10:15</span>
            </div>
          </div>
        </div>

        <div class="market-layout">
          <div>
            <div class="market-card">
              <div class="market-main-chart">
                <div class="market-chart-label">1m Candles · VWAP / OR / ATR · Today · ES</div>
                <div class="market-chart-legend">
                  <span class="legend-item">
                    <span class="legend-swatch"></span> VWAP
                  </span>
                  <span class="legend-item">
                    <span class="legend-swatch legend-swatch-or"></span> OR High/Low
                  </span>
                  <span class="legend-item">
                    <span class="legend-swatch legend-swatch-atr"></span> ATR Bands
                  </span>
                </div>
              </div>

              <div class="market-signals-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <span style="font-size:11px;color:var(--text-secondary);">Last Signals (this symbol)</span>
                  <span style="font-size:10px;color:var(--text-muted);">Linked to Worklist & Tickets</span>
                </div>
                <div style="overflow-x:auto;">
                  <table class="mini-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Strat</th>
                        <th>Score</th>
                        <th>Risk</th>
                        <th>Status</th>
                        <th>Entry</th>
                        <th>Stop</th>
                        <th>Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="mini-row">
                        <td>09:51:10</td>
                        <td>ORR</td>
                        <td>94</td>
                        <td><span class="risk-pill">GREEN</span></td>
                        <td><span class="status-pill">ACTIONABLE</span></td>
                        <td>4522.50</td>
                        <td>-8t</td>
                        <td>+16t</td>
                      </tr>
                      <tr class="mini-row">
                        <td>09:49:22</td>
                        <td>VWFT</td>
                        <td>90</td>
                        <td><span class="risk-pill">GREEN</span></td>
                        <td><span class="status-pill">ACTIONABLE</span></td>
                        <td>15308.00</td>
                        <td>-10t</td>
                        <td>+21t</td>
                      </tr>
                      <tr class="mini-row">
                        <td>09:46:03</td>
                        <td>OSB</td>
                        <td>82</td>
                        <td><span class="risk-pill-amber">AMBER</span></td>
                        <td><span class="status-pill">CONDITIONAL</span></td>
                        <td>987.80</td>
                        <td>-6t</td>
                        <td>+12t</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="market-card">
              <div class="section-title" style="margin-bottom:4px;">Context Cards</div>
              <div class="market-context-grid">
                <div class="context-card">
                  <div class="context-title">Session Metrics</div>
                  <div class="context-line">
                    <span>OR Width</span>
                    <span class="context-value">12.5 pts</span>
                  </div>
                  <div class="context-line">
                    <span>OR Mid</span>
                    <span class="context-value">4518.25</span>
                  </div>
                  <div class="context-line">
                    <span>VWAP</span>
                    <span class="context-value">4520.75</span>
                  </div>
                  <div class="context-line">
                    <span>VWAP Slope</span>
                    <span class="context-value">+0.32</span>
                  </div>
                </div>
                <div class="context-card">
                  <div class="context-title">Volatility & Regime</div>
                  <div class="context-line">
                    <span>ATR (14)</span>
                    <span class="context-value">6.2 pts</span>
                  </div>
                  <div class="context-line">
                    <span>Regime</span>
                    <span class="context-value">Trend Up</span>
                  </div>
                  <div class="context-line">
                    <span>OR Breakout</span>
                    <span class="context-value">Above</span>
                  </div>
                  <div class="context-line">
                    <span>Vol State</span>
                    <span class="context-value">High</span>
                  </div>
                </div>
                <div class="context-card">
                  <div class="context-title">Active Strategies</div>
                  <div class="context-line">
                    <span>ORR</span>
                    <span class="context-value">Enabled</span>
                  </div>
                  <div class="context-line">
                    <span>OSB</span>
                    <span class="context-value">Enabled</span>
                  </div>
                  <div class="context-line">
                    <span>VWAP-FT</span>
                    <span class="context-value">Enabled</span>
                  </div>
                  <div class="context-line">
                    <span>Filters</span>
                    <span class="context-value">Apex-compliant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  </div>
</div>

<script>
  (function() {
    const buttons = document.querySelectorAll(".view-toggle");
    const views = {
      worklist: document.getElementById("view-worklist"),
      market: document.getElementById("view-market")
    };
    const label = document.getElementById("view-label");

    function setView(name) {
      Object.keys(views).forEach(key => {
        views[key].classList.toggle("is-active", key === name);
      });
      buttons.forEach(btn => {
        btn.classList.toggle("is-active", btn.dataset.view === name);
      });
      label.textContent = name === "market"
        ? "Market (context for signals)"
        : "Worklist (tickets before action)";
    }

    buttons.forEach(btn => {
      btn.addEventListener("click", () => setView(btn.dataset.view));
    });

    setView("worklist");
  })();
</script>
</body>
</html>
EON

cat > server.js << 'EON'
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
  console.log("=== Worklist + Market A2 mock running at http://localhost:" + PORT + " ===");
});
EON

echo "=== STARTING WORKLIST + MARKET A2 MOCK SERVER ON http://localhost:3200 ==="
node server.js
