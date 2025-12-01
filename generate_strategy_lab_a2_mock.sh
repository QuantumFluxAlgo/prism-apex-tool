#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX — GENERATING STRATEGY LAB A2 MOCK (PORT 3200, NO NPM) ==="

cat > index.html << 'EON'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Prism Apex – Strategy Lab (A2 Theme Mock)</title>
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
      --bg-chip-muted: rgba(15,23,42,0.85);

      --border-subtle: rgba(255,255,255,0.04);
      --border-strong: rgba(255,255,255,0.12);

      --text-primary: #EDF2FF;
      --text-secondary: #A8B2C3;
      --text-muted: #6B7280;

      --accent-primary: #42E2F4;
      --accent-primary-soft: rgba(66,226,244,0.18);
      --accent-secondary: #A855F7;

      --accent-positive: #4BE8A3;
      --accent-positive-soft: rgba(75,232,163,0.15);
      --accent-warning: #FBBF24;
      --accent-warning-soft: rgba(251,191,36,0.18);
      --accent-danger: #F97373;
      --accent-danger-soft: rgba(249,115,115,0.18);

      --shadow-soft: 0 0 0 1px rgba(255,255,255,0.03);
      --shadow-glow-soft: 0 0 0 1px rgba(66,226,244,0.35),
                          0 0 20px rgba(66,226,244,0.32);

      --row-hover: rgba(255,255,255,0.03);
      --row-active: rgba(66,226,244,0.12);
    }

    * {
      box-sizing: border-box;
    }

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

    .pill-live {
      border-color: rgba(34,197,94,0.6);
      color: var(--accent-positive);
      background: rgba(15,23,42,0.85);
    }

    .pill-live-dot {
      background: var(--accent-positive);
      box-shadow: 0 0 10px rgba(34,197,94,0.9);
    }

    .shell-body {
      padding: 14px 16px 16px;
      background:
        radial-gradient(circle at top left, rgba(66,226,244,0.12), transparent 60%),
        radial-gradient(circle at bottom right, rgba(15,23,42,0.9), rgba(2,6,23,0.98));
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 10px;
      gap: 8px;
      flex-wrap: wrap;
    }

    .top-bar strong {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .selector-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 11px;
    }

    .selector {
      border-radius: 999px;
      padding: 3px 9px;
      border: 1px solid var(--border-subtle);
      background: rgba(2,6,23,0.88);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: default;
    }

    .selector-label {
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 10px;
    }

    .selector-value {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .selector-value-locked {
      color: var(--accent-warning);
    }

    .layout-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 2fr) minmax(0, 1.6fr);
      gap: 12px;
    }

    .column {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }

    .section-label {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .card {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: linear-gradient(to bottom, rgba(15,23,42,0.94), rgba(2,6,23,0.98));
      box-shadow: var(--shadow-soft);
      padding: 8px 9px 9px;
    }

    /* LEFT COLUMN – CONFIG SETS + SUGGESTIONS */
    .config-list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .config-list-title {
      font-size: 11px;
      color: var(--text-secondary);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .config-add {
      font-size: 11px;
      color: var(--accent-primary);
      cursor: default;
    }

    .config-set-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 8px;
    }

    .config-item {
      border-radius: 8px;
      padding: 6px 8px;
      border: 1px solid var(--border-subtle);
      background: rgba(2,6,23,0.92);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      cursor: default;
      position: relative;
      transition: background 120ms ease, box-shadow 120ms ease, transform 80ms ease;
    }

    .config-item:hover {
      background: rgba(15,23,42,0.96);
    }

    .config-item-active {
      background: linear-gradient(to right, var(--row-active), rgba(15,23,42,0.98));
      border-color: rgba(66,226,244,0.40);
      box-shadow: var(--shadow-glow-soft);
      transform: translateY(-0.5px);
    }

    .config-item-active::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(to bottom, var(--accent-primary), var(--accent-secondary));
    }

    .config-name {
      color: var(--text-primary);
      font-size: 11px;
    }

    .config-meta {
      font-size: 10px;
      color: var(--text-muted);
    }

    .config-state-chip {
      border-radius: 999px;
      padding: 2px 6px;
      font-size: 10px;
      border: 1px solid rgba(66,226,244,0.45);
      background: rgba(66,226,244,0.12);
      color: var(--accent-primary);
    }

    .suggestions-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
      margin-top: 2px;
    }

    .suggestions-title {
      font-size: 11px;
      color: var(--text-secondary);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .suggestion-pill {
      font-size: 10px;
      border-radius: 999px;
      padding: 2px 6px;
      border: 1px solid rgba(251,191,36,0.55);
      background: var(--accent-warning-soft);
      color: var(--accent-warning);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .suggestion-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
    }

    .suggestion-row {
      border-radius: 7px;
      padding: 4px 6px;
      border: 1px dashed rgba(251,191,36,0.55);
      background: rgba(15,23,42,0.94);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .suggestion-field {
      color: var(--text-secondary);
    }

    .suggestion-impact {
      font-size: 10px;
      color: var(--accent-warning);
    }

    /* MIDDLE COLUMN – ACTIVE CONFIG EDITOR */
    .editor-card {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background:
        radial-gradient(circle at top left, rgba(66,226,244,0.12), transparent 60%),
        linear-gradient(to bottom, rgba(15,23,42,0.96), rgba(2,6,23,0.98));
      box-shadow: var(--shadow-soft);
      padding: 8px 9px 10px;
    }

    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      gap: 8px;
      flex-wrap: wrap;
    }

    .editor-title-block {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .editor-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .editor-subtitle {
      font-size: 11px;
      color: var(--text-muted);
    }

    .editor-changes-pill {
      font-size: 10px;
      border-radius: 999px;
      padding: 2px 7px;
      border: 1px solid rgba(66,226,244,0.50);
      background: rgba(15,23,42,0.92);
      color: var(--accent-primary);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .editor-table-wrap {
      border-radius: 9px;
      border: 1px solid rgba(15,23,42,0.96);
      background: rgba(2,6,23,0.96);
      overflow: hidden;
    }

    .editor-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
    }

    .editor-table th,
    .editor-table td {
      padding: 5px 6px;
      border-bottom: 1px solid rgba(15,23,42,0.96);
      white-space: nowrap;
    }

    .editor-table th {
      font-size: 10px;
      text-align: left;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--text-muted);
      background: rgba(2,6,23,0.96);
    }

    .editor-table tbody tr {
      background: rgba(2,6,23,0.96);
    }

    .editor-table tbody tr:nth-child(even) {
      background: rgba(15,23,42,0.96);
    }

    .editor-row-changed {
      background: linear-gradient(to right, rgba(168,85,247,0.22), rgba(15,23,42,0.96));
      position: relative;
    }

    .editor-row-changed::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(to bottom, var(--accent-secondary), var(--accent-primary));
    }

    .value-pill {
      border-radius: 999px;
      padding: 1px 6px 2px;
      border: 1px solid var(--border-subtle);
      background: rgba(15,23,42,0.92);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
    }

    .value-pill-new {
      border-color: rgba(66,226,244,0.7);
      background: rgba(66,226,244,0.12);
      color: var(--accent-primary);
    }

    .impact-tag {
      border-radius: 999px;
      padding: 2px 6px;
      font-size: 10px;
      border: 1px solid var(--border-subtle);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .impact-safer {
      border-color: rgba(75,232,163,0.6);
      background: var(--accent-positive-soft);
      color: var(--accent-positive);
    }

    .impact-riskier {
      border-color: rgba(249,115,115,0.7);
      background: var(--accent-danger-soft);
      color: var(--accent-danger);
    }

    .impact-neutral {
      border-color: rgba(156,163,175,0.7);
      background: rgba(15,23,42,0.92);
      color: var(--text-secondary);
    }

    .editor-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 7px;
      gap: 8px;
      flex-wrap: wrap;
    }

    .help-text {
      font-size: 10px;
      color: var(--text-muted);
    }

    .button-row {
      display: inline-flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .btn {
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      border: 1px solid var(--border-subtle);
      background: rgba(2,6,23,0.9);
      color: var(--text-secondary);
      cursor: default;
    }

    .btn-primary {
      border-color: rgba(66,226,244,0.8);
      background: linear-gradient(to right, var(--accent-primary), var(--accent-secondary));
      color: #020617;
      box-shadow: var(--shadow-glow-soft);
    }

    .btn-ghost {
      background: transparent;
    }

    /* RIGHT COLUMN – BACKTEST + SCENARIOS */
    .backtest-card {
      border-radius: 10px;
      border: 1px solid rgba(66,226,244,0.35);
      background:
        radial-gradient(circle at top left, rgba(66,226,244,0.20), transparent 60%),
        radial-gradient(circle at bottom right, rgba(15,23,42,0.98), rgba(2,6,23,0.98));
      box-shadow: var(--shadow-glow-soft);
      padding: 8px 9px 9px;
    }

    .backtest-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
      gap: 8px;
    }

    .backtest-title {
      font-size: 11px;
      color: var(--text-secondary);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .backtest-meta {
      font-size: 10px;
      color: var(--text-muted);
    }

    .backtest-metrics {
      display: grid;
      grid-template-columns: minmax(0,1fr);
      gap: 4px;
      font-size: 11px;
      margin-bottom: 7px;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .metric-label {
      color: var(--text-secondary);
    }

    .metric-value {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
    }

    .metric-delta-pos {
      color: var(--accent-positive);
      font-size: 10px;
      margin-left: 4px;
    }

    .metric-delta-neg {
      color: var(--accent-danger);
      font-size: 10px;
      margin-left: 4px;
    }

    .equity-chart {
      margin-top: 5px;
      border-radius: 8px;
      height: 80px;
      background:
        radial-gradient(circle at 10% 0, rgba(66,226,244,0.6), transparent 55%),
        radial-gradient(circle at 100% 100%, rgba(34,197,94,0.7), transparent 55%),
        linear-gradient(to top, rgba(15,23,42,1), rgba(15,23,42,0.94));
      position: relative;
      overflow: hidden;
    }

    .equity-chart::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(to right, rgba(15,23,42,0.9), transparent 25%, transparent 75%, rgba(15,23,42,0.95)),
        linear-gradient(to top, rgba(15,23,42,0.7), transparent 40%);
      opacity: 0.95;
    }

    .scenario-card {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: linear-gradient(to bottom, rgba(15,23,42,0.96), rgba(2,6,23,0.98));
      box-shadow: var(--shadow-soft);
      padding: 7px 9px 9px;
    }

    .scenario-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .scenario-title {
      font-size: 11px;
      color: var(--text-secondary);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .scenario-helper {
      font-size: 10px;
      color: var(--text-muted);
    }

    .scenario-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
    }

    .scenario-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-radius: 7px;
      padding: 4px 6px;
      border: 1px solid rgba(15,23,42,0.96);
      background: rgba(2,6,23,0.96);
    }

    .scenario-name {
      color: var(--text-secondary);
    }

    .scenario-status {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.10em;
    }

    .scenario-pass {
      color: var(--accent-positive);
    }

    .scenario-warn {
      color: var(--accent-warning);
    }

    .scenario-fail {
      color: var(--accent-danger);
    }

    @media (max-width: 1040px) {
      .layout-grid {
        grid-template-columns: minmax(0,1.5fr) minmax(0,2fr);
        grid-template-rows: auto auto;
      }
      .column-right {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 840px) {
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
      <div class="header-left">
        <div class="app-title">PRISM APEX – STRATEGY LAB</div>
        <div class="app-subtitle">Config editing · suggestion engine · backtesting (A2 visual variant)</div>
      </div>
      <div class="header-right">
        <div class="pill">
          <span class="pill-dot"></span>
          <span>A2 · Ultra-Modern Fintech Glow</span>
        </div>
        <div class="pill pill-live">
          <span class="pill-live-dot"></span>
          <span>Sim / Prod aware · Read-only on Prod</span>
        </div>
      </div>
    </header>

    <main class="shell-body">
      <div class="top-bar">
        <div>Strategy: <strong>ORR</strong> · Symbol: <strong>ES</strong> · Config Set: <strong>ORR_ES_D1</strong></div>
        <div class="selector-row">
          <div class="selector">
            <span class="selector-label">Env</span>
            <span class="selector-value">Sim</span>
          </div>
          <div class="selector">
            <span class="selector-label">State</span>
            <span class="selector-value-locked">Saved · 3 pending changes</span>
          </div>
        </div>
      </div>

      <div class="layout-grid">
        <!-- LEFT COLUMN -->
        <section class="column">
          <div class="section-label">Config Sets & Suggestions</div>
          <div class="card">
            <div class="config-list-header">
              <div class="config-list-title">Config Sets</div>
              <div class="config-add">+ Duplicate</div>
            </div>
            <div class="config-set-list">
              <div class="config-item config-item-active">
                <div>
                  <div class="config-name">ORR_ES_D1</div>
                  <div class="config-meta">Active · Last updated 09:52</div>
                </div>
                <div class="config-state-chip">Active · Saved</div>
              </div>
              <div class="config-item">
                <div>
                  <div class="config-name">ORR_NQ_H1</div>
                  <div class="config-meta">Idle · Last updated 08:13</div>
                </div>
                <div class="config-meta">Prod-compatible</div>
              </div>
              <div class="config-item">
                <div>
                  <div class="config-name">OSB_ES_15m</div>
                  <div class="config-meta">Draft · Sim only</div>
                </div>
                <div class="config-meta">3 suggestions</div>
              </div>
            </div>

            <div class="suggestions-header">
              <div class="suggestions-title">Suggestions</div>
              <div class="suggestion-pill">! Engine: 2 pending diffs</div>
            </div>

            <div class="suggestion-list">
              <div class="suggestion-row">
                <div>
                  <div class="suggestion-field">Raise rrBandMin</div>
                  <div style="font-size:10px;color:var(--text-muted);">1.3 → 1.5 on TrendUp sessions</div>
                </div>
                <div class="suggestion-impact">Impact: Sharper entries</div>
              </div>
              <div class="suggestion-row">
                <div>
                  <div class="suggestion-field">Reduce size in Chop</div>
                  <div style="font-size:10px;color:var(--text-muted);">Contracts: 2 → 1 in Chop / Low ATR</div>
                </div>
                <div class="suggestion-impact">Impact: Lower DD</div>
              </div>
            </div>
          </div>
        </section>

        <!-- MIDDLE COLUMN -->
        <section class="column">
          <div class="section-label">Active Config Editor</div>
          <div class="editor-card">
            <div class="editor-header">
              <div class="editor-title-block">
                <div class="editor-title">ORR_ES_D1 · Parameters</div>
                <div class="editor-subtitle">Each change tracked, backtest-driven, Apex rules-aware.</div>
              </div>
              <div class="editor-changes-pill">
                <span style="width:7px;height:7px;border-radius:999px;background:var(--accent-primary);box-shadow:0 0 10px rgba(66,226,244,0.9);"></span>
                <span>3 pending fields</span>
              </div>
            </div>

            <div class="editor-table-wrap">
              <table class="editor-table">
                <thead>
                  <tr>
                    <th>Param</th>
                    <th>Current</th>
                    <th>Suggested</th>
                    <th>Impact</th>
                    <th>?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="editor-row-changed">
                    <td>rrBandMin</td>
                    <td><span class="value-pill">1.3</span></td>
                    <td><span class="value-pill value-pill-new">1.5</span></td>
                    <td><span class="impact-tag impact-riskier">More selective</span></td>
                    <td>⋯</td>
                  </tr>
                  <tr class="editor-row-changed">
                    <td>stopTicks</td>
                    <td><span class="value-pill">8</span></td>
                    <td><span class="value-pill value-pill-new">10</span></td>
                    <td><span class="impact-tag impact-safer">Safer · lower DD</span></td>
                    <td>⋯</td>
                  </tr>
                  <tr>
                    <td>rrBandMax</td>
                    <td><span class="value-pill">2.3</span></td>
                    <td><span class="value-pill">2.3</span></td>
                    <td><span class="impact-tag impact-neutral">Unchanged</span></td>
                    <td>⋯</td>
                  </tr>
                  <tr class="editor-row-changed">
                    <td>ATRFactor</td>
                    <td><span class="value-pill">1.0</span></td>
                    <td><span class="value-pill value-pill-new">1.2</span></td>
                    <td><span class="impact-tag impact-safer">Vol-fit</span></td>
                    <td>⋯</td>
                  </tr>
                  <tr>
                    <td>sessionFilter</td>
                    <td><span class="value-pill">RTH only</span></td>
                    <td><span class="value-pill">RTH only</span></td>
                    <td><span class="impact-tag impact-neutral">No change</span></td>
                    <td>⋯</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="editor-footer">
              <div class="help-text">
                Preview runs a thin backtest over the last 60 sessions with Apex risk constraints applied.
              </div>
              <div class="button-row">
                <button class="btn btn-ghost">Reset</button>
                <button class="btn">Preview Impact</button>
                <button class="btn btn-primary">Apply Changes</button>
              </div>
            </div>
          </div>
        </section>

        <!-- RIGHT COLUMN -->
        <section class="column column-right">
          <div class="section-label">Backtest & Scenario Impact</div>

          <div class="backtest-card">
            <div class="backtest-header">
              <div>
                <div class="backtest-title">Backtest Results</div>
                <div class="backtest-meta">Window: last 60 RTH sessions · ES ORR</div>
              </div>
              <div style="font-size:10px;color:var(--accent-primary);">Simulated · Config diff applied</div>
            </div>

            <div class="backtest-metrics">
              <div class="metric-row">
                <span class="metric-label">Win Rate</span>
                <span class="metric-value">62% <span class="metric-delta-pos">→ 68%</span></span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Profit Factor</span>
                <span class="metric-value">1.8 <span class="metric-delta-pos">→ 2.1</span></span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Max Drawdown</span>
                <span class="metric-value">-3.2% <span class="metric-delta-pos">→ -2.1%</span></span>
              </div>
            </div>

            <div class="equity-chart"></div>
          </div>

          <div class="scenario-card">
            <div class="scenario-header">
              <div class="scenario-title">Scenario Tests</div>
              <div class="scenario-helper">Synthetic runs for core intraday regimes.</div>
            </div>
            <div class="scenario-list">
              <div class="scenario-row">
                <span class="scenario-name">Trend Up (Strong)</span>
                <span class="scenario-status scenario-pass">PASS</span>
              </div>
              <div class="scenario-row">
                <span class="scenario-name">Trend Down</span>
                <span class="scenario-status scenario-fail">FAIL · high DD</span>
              </div>
              <div class="scenario-row">
                <span class="scenario-name">Chop Day</span>
                <span class="scenario-status scenario-pass">PASS</span>
              </div>
              <div class="scenario-row">
                <span class="scenario-name">Volatility Spike</span>
                <span class="scenario-status scenario-warn">WARN · unstable</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</div>
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
  console.log("=== Strategy Lab A2 mock running at http://localhost:" + PORT + " ===");
});
EON

echo "=== STARTING STRATEGY LAB A2 MOCK SERVER ON http://localhost:3200 ==="
node server.js
