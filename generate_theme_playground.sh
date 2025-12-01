#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX — GENERATING THEME PLAYGROUND (PORT 3200, NO NPM) ==="

cat > index.html << 'EON'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Prism Apex – Theme Playground (A2 vs A3)</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <!-- Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

  <style>
    :root {
      /* Default = A3 (Hybrid Quant + High-End SaaS) */
      --bg-deep: #050509;
      --bg-shell: #050509;
      --bg-panel: #10121A;
      --bg-elevated: #181C24;
      --bg-header: #151824;

      --border-subtle: rgba(255,255,255,0.03);
      --border-strong: rgba(255,255,255,0.10);

      --text-primary: #E5ECF7;
      --text-secondary: #99A2B5;
      --text-muted: #5F6472;

      --accent-primary: #38D6EA;  /* cyan */
      --accent-secondary: #4F8DF5; /* indigo */

      --accent-positive: #34D399;
      --accent-warning: #F59E0B;
      --accent-danger: #EF4444;

      --accent-positive-soft: rgba(52,211,153,0.12);
      --accent-warning-soft: rgba(245,158,11,0.14);
      --accent-danger-soft: rgba(239,68,68,0.16);

      --row-hover: rgba(255,255,255,0.02);
      --row-active: rgba(56,214,234,0.08);

      --shadow-soft: 0 0 0 1px rgba(255,255,255,0.02);
      --shadow-glow-soft: 0 0 0 1px rgba(56,214,234,0.35),
                          0 0 18px rgba(56,214,234,0.20);

      --kpi-bg: var(--bg-elevated);
      --kpi-border: var(--border-strong);
      --kpi-shadow: 0 0 0 1px rgba(255,255,255,0.04);

      --chip-bg: rgba(124,135,151,0.16);
      --chip-border: rgba(124,135,151,0.40);
    }

    /* A2 – Ultra-Modern Fintech Glow */
    body[data-theme="a2"] {
      --bg-deep: #05060A;
      --bg-shell: #05060A;
      --bg-panel: #0E1117;
      --bg-elevated: #171B24;
      --bg-header: #171B24;

      --border-subtle: rgba(255,255,255,0.04);
      --border-strong: rgba(255,255,255,0.12);

      --text-primary: #EDF2FF;
      --text-secondary: #A8B2C3;
      --text-muted: #6B7280;

      --accent-primary: #42E2F4;   /* brighter cyan */
      --accent-secondary: #A855F7; /* violet accent */

      --accent-positive: #4BE8A3;
      --accent-warning: #FBBF24;
      --accent-danger: #F97373;

      --accent-positive-soft: rgba(75,232,163,0.15);
      --accent-warning-soft: rgba(251,191,36,0.18);
      --accent-danger-soft: rgba(249,115,115,0.18);

      --row-hover: rgba(255,255,255,0.03);
      --row-active: rgba(66,226,244,0.10);

      --shadow-soft: 0 0 0 1px rgba(255,255,255,0.03);
      --shadow-glow-soft: 0 0 0 1px rgba(66,226,244,0.35),
                          0 0 20px rgba(66,226,244,0.32);

      --kpi-bg: rgba(23,27,36,0.92);
      --kpi-border: rgba(66,226,244,0.35);
      --kpi-shadow: 0 0 0 1px rgba(66,226,244,0.35),
                    0 0 20px rgba(66,226,244,0.30);

      --chip-bg: rgba(66,226,244,0.16);
      --chip-border: rgba(66,226,244,0.45);
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Space Grotesk", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at top left, #101522 0, var(--bg-shell) 38%, #020309 100%);
      color: var(--text-primary);
    }

    .page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px 24px 40px;
    }

    .shell {
      border-radius: 18px;
      border: 1px solid var(--border-strong);
      background: radial-gradient(circle at top, rgba(79,141,245,0.10), transparent 55%),
                  linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(0,0,0,0.45));
      box-shadow: 0 20px 60px rgba(0,0,0,0.75);
      overflow: hidden;
    }

    .shell-header {
      padding: 16px 18px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(to right, rgba(0,0,0,0.5), rgba(15,23,42,0.6));
    }

    .shell-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .shell-subtitle {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .shell-header-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .shell-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .theme-pill {
      font-size: 11px;
      border-radius: 999px;
      padding: 3px 8px;
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(0,0,0,0.45);
    }

    .theme-toggle-group {
      display: inline-flex;
      padding: 2px;
      border-radius: 999px;
      border: 1px solid var(--border-subtle);
      background: rgba(0,0,0,0.5);
    }

    .theme-toggle {
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

    .theme-toggle.is-active {
      background: linear-gradient(to right, var(--accent-primary), var(--accent-secondary));
      color: #020617;
      box-shadow: 0 0 0 1px rgba(15,23,42,0.8);
    }

    .shell-body {
      padding: 16px 18px 18px;
      background: radial-gradient(circle at top left, rgba(56,214,234,0.06), transparent 55%),
                  radial-gradient(circle at bottom right, rgba(79,141,245,0.12), transparent 60%),
                  linear-gradient(to bottom, rgba(2,6,23,0.9), rgba(2,6,23,0.98));
    }

    .layout-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.4fr);
      gap: 14px;
    }

    .column {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-title {
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
    }

    .badge-live {
      border-color: var(--accent-primary);
      color: var(--accent-primary);
      background: rgba(56,214,234,0.12);
    }

    .badge-sim {
      border-color: rgba(148,163,184,0.6);
      color: rgba(148,163,184,0.9);
      background: rgba(15,23,42,0.9);
    }

    /* Worklist preview */
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
    }

    .worklist-header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .worklist-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 10px;
    }

    .chip {
      border-radius: 999px;
      padding: 3px 7px;
      border: 1px solid var(--chip-border);
      background: var(--chip-bg);
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
      border-color: rgba(56,214,234,0.55);
      background: rgba(56,214,234,0.12);
      color: var(--accent-primary);
    }

    .chip-risk-green {
      border-color: rgba(52,211,153,0.55);
      background: var(--accent-positive-soft);
      color: var(--accent-positive);
    }

    .chip-risk-amber {
      border-color: rgba(245,158,11,0.55);
      background: var(--accent-warning-soft);
      color: var(--accent-warning);
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
      background: radial-gradient(circle at 10% 0, rgba(56,214,234,0.5), transparent 55%),
                  radial-gradient(circle at 90% 100%, rgba(79,141,245,0.85), transparent 55%),
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

    /* Analytics preview */
    .analytics-card {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: linear-gradient(to bottom, rgba(15,23,42,0.94), rgba(2,6,23,0.98));
      box-shadow: var(--shadow-soft);
      padding: 10px 10px 11px;
    }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0,1fr));
      gap: 8px;
      margin-bottom: 10px;
    }

    .kpi-card {
      border-radius: 9px;
      background: var(--kpi-bg);
      border: 1px solid var(--kpi-border);
      box-shadow: var(--kpi-shadow);
      padding: 8px 9px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .kpi-label {
      font-size: 10px;
      color: var(--text-secondary);
    }

    .kpi-value {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .kpi-delta {
      font-size: 10px;
      color: var(--accent-positive);
    }

    .kpi-delta.neg {
      color: var(--accent-danger);
    }

    .chart-strip {
      display: grid;
      grid-template-columns: minmax(0,1.1fr) minmax(0,1.1fr);
      gap: 8px;
    }

    .chart-card {
      border-radius: 9px;
      border: 1px solid var(--border-subtle);
      background: radial-gradient(circle at top left, rgba(56,214,234,0.16), transparent 60%),
                  radial-gradient(circle at bottom right, rgba(79,141,245,0.20), transparent 60%),
                  rgba(5,6,12,0.95);
      padding: 7px 8px 8px;
    }

    .chart-title {
      font-size: 10px;
      color: var(--text-secondary);
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chart-body {
      height: 74px;
      border-radius: 7px;
      background: radial-gradient(circle at 0 100%, rgba(34,197,94,0.4), transparent 50%),
                  radial-gradient(circle at 100% 0, rgba(239,68,68,0.4), transparent 50%),
                  linear-gradient(to top, rgba(15,23,42,1), rgba(15,23,42,0.92));
      position: relative;
      overflow: hidden;
    }

    .chart-body::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(to right, rgba(15,23,42,0.9) 0, transparent 20%, transparent 80%, rgba(15,23,42,0.9) 100%),
        linear-gradient(to top, rgba(15,23,42,0.7), transparent 35%);
      opacity: 0.9;
    }

    /* System preview */
    .system-card {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: linear-gradient(to bottom, rgba(15,23,42,0.96), rgba(15,23,42,0.98));
      box-shadow: var(--shadow-soft);
      padding: 9px 10px 10px;
    }

    .health-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0,1fr));
      gap: 6px;
      margin-bottom: 8px;
    }

    .health-card {
      border-radius: 9px;
      padding: 6px 7px;
      border: 1px solid var(--border-subtle);
      background: rgba(2,6,23,0.96);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .health-label {
      font-size: 10px;
      color: var(--text-secondary);
    }

    .health-status {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 11px;
    }

    .health-ok {
      color: var(--accent-positive);
    }

    .health-warn {
      color: var(--accent-warning);
    }

    .health-err {
      color: var(--accent-danger);
    }

    .log-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      font-size: 10px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
    }

    .log-table th,
    .log-table td {
      padding: 4px 6px;
      border-bottom: 1px solid rgba(15,23,42,0.95);
      white-space: nowrap;
    }

    .log-table th {
      text-align: left;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .log-row-warn {
      background: linear-gradient(to right, rgba(245,158,11,0.10), rgba(15,23,42,0.96));
    }

    .log-row-err {
      background: linear-gradient(to right, rgba(239,68,68,0.16), rgba(15,23,42,0.96));
    }

    .log-level {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .log-level-info {
      color: var(--text-secondary);
    }

    .log-level-warn {
      color: var(--accent-warning);
    }

    .log-level-err {
      color: var(--accent-danger);
    }

    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .meta-bar span strong {
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* Responsive */
    @media (max-width: 880px) {
      .layout-grid {
        grid-template-columns: minmax(0,1fr);
      }
    }

  </style>
</head>
<body>
<div class="page">
  <div class="shell">
    <header class="shell-header">
      <div class="shell-header-left">
        <div class="shell-title">PRISM APEX – THEME PLAYGROUND</div>
        <div class="shell-subtitle">
          Compare A2 (Ultra-Modern Glow) vs A3 (Hybrid Quant) without touching the real app.
        </div>
      </div>
      <div class="shell-header-right">
        <div class="theme-pill">
          <span style="width:7px;height:7px;border-radius:999px;background:var(--accent-primary);box-shadow:0 0 8px rgba(56,214,234,0.7);"></span>
          <span>Preview only</span>
        </div>
        <div class="theme-toggle-group">
          <button class="theme-toggle" data-theme="a2">A2 · Glow</button>
          <button class="theme-toggle" data-theme="a3">A3 · Quant</button>
        </div>
      </div>
    </header>

    <main class="shell-body">
      <div class="meta-bar">
        <span>Theme: <strong id="theme-label">A3 · Hybrid Quant + High-End SaaS</strong></span>
        <span>Previewing: Worklist · Analytics · System</span>
      </div>

      <div class="layout-grid">
        <!-- LEFT COLUMN -->
        <section class="column">
          <div>
            <div class="section-title">Execution · Worklist Preview</div>
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
              <div style="overflow-x:auto;">
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
          </div>

          <div>
            <div class="section-title">System · Health & Logs Preview</div>
            <div class="system-card">
              <div class="health-row">
                <div class="health-card">
                  <div class="health-label">API / Ingress</div>
                  <div class="health-status health-ok">OK · 45ms</div>
                </div>
                <div class="health-card">
                  <div class="health-label">DB / Storage</div>
                  <div class="health-status health-ok">OK · 0.0s lag</div>
                </div>
                <div class="health-card">
                  <div class="health-label">Strategy Engine</div>
                  <div class="health-status health-ok">All workers up</div>
                </div>
                <div class="health-card">
                  <div class="health-label">Risk Engine</div>
                  <div class="health-status health-ok">Hard stop: OFF</div>
                </div>
              </div>

              <table class="log-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Lvl</th>
                    <th>Component</th>
                    <th>Symbol</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>09:51:10</td>
                    <td><span class="log-level log-level-info">INFO</span></td>
                    <td>strategy-orr</td>
                    <td>ES</td>
                    <td>Ticket generated (score=92 risk=GREEN)</td>
                  </tr>
                  <tr class="log-row-warn">
                    <td>09:51:30</td>
                    <td><span class="log-level log-level-warn">WARN</span></td>
                    <td>ingress-yahoo</td>
                    <td>CL</td>
                    <td>Ingress delay detected: 2.1s</td>
                  </tr>
                  <tr class="log-row-err">
                    <td>09:52:02</td>
                    <td><span class="log-level log-level-err">ERROR</span></td>
                    <td>risk-engine</td>
                    <td>NQ</td>
                    <td>Risk check failed (DD limit reached)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- RIGHT COLUMN -->
        <section class="column">
          <div>
            <div class="section-title">Analytics · KPIs & Drift Preview</div>
            <div class="analytics-card">
              <div class="kpi-row">
                <div class="kpi-card">
                  <div class="kpi-label">Total Tickets</div>
                  <div class="kpi-value">124</div>
                  <div class="kpi-delta">+18 vs prev 20d</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">Win Rate</div>
                  <div class="kpi-value">62%</div>
                  <div class="kpi-delta">+4.1 pts</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">Max Drawdown</div>
                  <div class="kpi-value">-3.4%</div>
                  <div class="kpi-delta neg">-0.6 pts</div>
                </div>
              </div>

              <div class="chart-strip">
                <div class="chart-card">
                  <div class="chart-title">
                    <span>PnL / Score by Day</span>
                    <span class="badge badge-sim">Sim window · 60 sessions</span>
                  </div>
                  <div class="chart-body"></div>
                </div>

                <div class="chart-card">
                  <div class="chart-title">
                    <span>Config Impact</span>
                    <span style="font-size:10px;color:var(--accent-primary);">
                      1.8 → 2.1 PF
                    </span>
                  </div>
                  <div class="chart-body"></div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="section-title">Strategy Snapshot</div>
            <div class="system-card">
              <table class="log-table">
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th>Symbol</th>
                    <th>Tickets</th>
                    <th>Win%</th>
                    <th>Avg Score</th>
                    <th>R:R</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>ORR</td>
                    <td>ES</td>
                    <td>54</td>
                    <td>64%</td>
                    <td>88</td>
                    <td>2.1</td>
                    <td>Strong in TrendUp</td>
                  </tr>
                  <tr>
                    <td>OSB</td>
                    <td>NQ</td>
                    <td>33</td>
                    <td>55%</td>
                    <td>81</td>
                    <td>1.6</td>
                    <td>Weak in Chop</td>
                  </tr>
                  <tr>
                    <td>VWFT</td>
                    <td>CL</td>
                    <td>19</td>
                    <td>58%</td>
                    <td>84</td>
                    <td>1.9</td>
                    <td>Strong VWAP mean reversion</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </section>
      </div>
    </main>
  </div>
</div>

<script>
  (function() {
    const buttons = document.querySelectorAll(".theme-toggle");
    const label = document.getElementById("theme-label");

    function applyTheme(theme) {
      document.body.setAttribute("data-theme", theme);
      buttons.forEach(btn => {
        btn.classList.toggle("is-active", btn.dataset.theme === theme);
      });
      if (theme === "a2") {
        label.textContent = "A2 · Ultra-Modern Fintech Glow";
      } else {
        label.textContent = "A3 · Hybrid Quant + High-End SaaS";
      }
      try {
        window.localStorage.setItem("pa-theme", theme);
      } catch (e) {}
    }

    // Wire buttons
    buttons.forEach(btn => {
      btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
    });

    // Init from localStorage or default A3
    let saved = null;
    try {
      saved = window.localStorage.getItem("pa-theme");
    } catch (e) {}
    applyTheme(saved === "a2" ? "a2" : "a3");
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
  console.log("=== Theme playground running at http://localhost:" + PORT + " ===");
});
EON

chmod +x generate_theme_playground.sh

echo "=== STARTING THEME PLAYGROUND MOCK SERVER ON http://localhost:3200 ==="
node server.js
