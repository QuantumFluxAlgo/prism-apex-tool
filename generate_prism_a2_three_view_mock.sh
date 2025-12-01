#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX — A2 (Satoshi + Geist Mono) MOCK v3: WORKLIST / MARKET / STRATEGY LAB (PORT 3200, NO NPM) ==="

cat > index.html << 'EON'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Prism Apex – A2 Mock · Worklist / Market / Strategy Lab</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />

  <!-- Satoshi + Geist Mono via Fontshare (or local if installed) -->
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet" />
  <link href="https://api.fontshare.com/v2/css?f[]=geist-mono@400,500,600&display=swap" rel="stylesheet" />

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
      --shadow-elevated: 0 18px 40px rgba(0,0,0,0.85);
      --shadow-glow-primary: 0 0 0 1px rgba(66,226,244,0.45),
                             0 0 22px rgba(66,226,244,0.45);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg-page);
      color: var(--text-primary);
    }

    .mono {
      font-family: "Geist Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular,
        Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-feature-settings: "tnum" 1, "ss01" 1;
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
      box-shadow: var(--shadow-elevated);
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
      letter-spacing: 0.14em;
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
      transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease, transform 80ms ease;
    }

    .view-toggle.is-active {
      background: linear-gradient(to right, var(--accent-primary), var(--accent-secondary));
      color: #020617;
      box-shadow: 0 0 0 1px rgba(15,23,42,0.8);
      transform: translateY(-0.5px);
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
      opacity: 0;
      pointer-events: none;
      transform: translateY(4px);
      transition: opacity 140ms ease-out, transform 140ms ease-out;
    }

    .view.is-active {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    .section-title {
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 8px;
      font-weight: 600;
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

    /* Risk / status standards */
    .risk-green {
      border-radius: 999px;
      padding: 1px 5px 2px;
      border: 1px solid rgba(75,232,163,0.6);
      background: var(--accent-positive-soft);
      color: var(--accent-positive);
      font-size: 9px;
    }

    .risk-amber {
      border-radius: 999px;
      padding: 1px 5px 2px;
      border: 1px solid rgba(251,191,36,0.7);
      background: var(--accent-warning-soft);
      color: var(--accent-warning);
      font-size: 9px;
    }

    .risk-red {
      border-radius: 999px;
      padding: 1px 5px 2px;
      border: 1px solid rgba(249,115,115,0.8);
      background: var(--accent-danger-soft);
      color: var(--accent-danger);
      font-size: 9px;
    }

    .status-pill {
      border-radius: 999px;
      padding: 1px 5px 2px;
      border: 1px solid rgba(66,226,244,0.55);
      background: var(--accent-primary-soft);
      color: var(--accent-primary);
      font-size: 9px;
    }

    .status-pill-expired {
      border-color: rgba(148,163,184,0.7);
      background: rgba(15,23,42,0.95);
      color: var(--text-muted);
    }

    .timer-hot {
      color: var(--accent-warning);
      font-weight: 500;
    }

    .timer-warm {
      color: var(--text-secondary);
    }

    .timer-cold {
      color: var(--text-muted);
    }

    /* WORKLIST VIEW */
    .worklist-card {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(2,6,23,0.98));
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
      font-size: 10px;
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
      border-color: rgba(75,232,163,0.6);
      background: var(--accent-positive-soft);
      color: var(--accent-positive);
    }

    .chip-risk-amber {
      border-color: rgba(251,191,36,0.7);
      background: var(--accent-warning-soft);
      color: var(--accent-warning);
    }

    .chip.is-clickable {
      cursor: pointer;
      transition: background 120ms ease, border-color 120ms ease, transform 80ms ease;
    }

    .chip.is-clickable:hover {
      background: rgba(66,226,244,0.10);
      border-color: rgba(66,226,244,0.65);
      transform: translateY(-0.5px);
    }

    .worklist-table-wrap {
      overflow-x: auto;
    }

    .worklist-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    .worklist-table thead {
      background: rgba(15,23,42,0.96);
    }

    .worklist-table th,
    .worklist-table td {
      padding: 4px 8px;
      border-bottom: 1px solid rgba(15,23,42,0.9);
      white-space: nowrap;
    }

    .worklist-table th {
      font-size: 10px;
      text-align: left;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 500;
    }

    /* numeric alignment */
    .worklist-table td:nth-child(1),  /* Score */
    .worklist-table td:nth-child(5),  /* Cnt */
    .worklist-table td:nth-child(6),  /* Entry */
    .worklist-table td:nth-child(7),  /* Stop */
    .worklist-table td:nth-child(8),  /* Target */
    .worklist-table td:nth-child(9) { /* R:R */
      text-align: right;
    }

    .worklist-table td:nth-child(10) { /* Regime text */
      text-align: left;
    }

    .worklist-table td:nth-child(12) { /* Timer */
      text-align: right;
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
      box-shadow: var(--shadow-glow-primary);
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
      background: radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(2,6,23,0.98));
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
      font-size: 10px;
    }

    .context-title {
      font-size: 11px;
      color: var(--text-secondary);
      margin-bottom: 3px;
    }

    .context-line {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      margin-bottom: 1px;
      color: var(--text-muted);
    }

    .context-value {
      color: var(--text-secondary);
    }

    .market-signals-card {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: linear-gradient(to right, rgba(15,23,42,0.96), rgba(15,23,42,0.96));
      box-shadow: var(--shadow-soft);
      padding: 7px 9px 8px;
      margin-top: 10px;
    }

    .mini-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .mini-table th,
    .mini-table td {
      padding: 4px 6px;
      border-bottom: 1px solid rgba(15,23,42,0.95);
      white-space: nowrap;
    }

    .mini-table th {
      text-align: left;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 500;
    }

    .mini-row {
      background: rgba(2,6,23,0.96);
    }

    .mini-row:nth-child(even) {
      background: rgba(15,23,42,0.96);
    }

    .mini-table td:nth-child(1),
    .mini-table td:nth-child(3),
    .mini-table td:nth-child(6),
    .mini-table td:nth-child(7),
    .mini-table td:nth-child(8) {
      text-align: right;
    }

    /* STRATEGY LAB VIEW */
    .layout-grid-lab {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 2fr) minmax(0, 1.6fr);
      gap: 12px;
    }

    @media (max-width: 1040px) {
      .layout-grid-lab {
        grid-template-columns: minmax(0,1.5fr) minmax(0,2fr);
        grid-template-rows: auto auto;
      }
      .column-right-lab {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 840px) {
      .layout-grid-lab {
        grid-template-columns: minmax(0,1fr);
      }
    }

    .column {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }

    .card {
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background: radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(2,6,23,0.98));
      box-shadow: var(--shadow-soft);
      padding: 8px 9px 9px;
    }

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
      position: relative;
      transition: background 120ms ease, box-shadow 120ms ease, transform 80ms ease;
    }

    .config-item:hover {
      background: rgba(15,23,42,0.96);
    }

    .config-item-active {
      background: linear-gradient(to right, var(--row-active), rgba(15,23,42,0.98));
      border-color: rgba(66,226,244,0.40);
      box-shadow: var(--shadow-glow-primary);
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
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
      background: rgba(2,6,23,0.96);
      font-weight: 500;
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
      font-size: 10px;
      color: var(--text-muted);
    }

    .button-row {
      display: inline-flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .btn {
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      border: 1px solid var(--border-subtle);
      background: rgba(2,6,23,0.9);
      color: var(--text-secondary);
    }

    .btn-primary {
      border-color: rgba(66,226,244,0.8);
      background: linear-gradient(to right, var(--accent-primary), var(--accent-secondary));
      color: #020617;
      box-shadow: var(--shadow-glow-primary);
    }

    .btn-ghost {
      background: transparent;
    }

    .backtest-card {
      border-radius: 10px;
      border: 1px solid rgba(66,226,244,0.35);
      background:
        radial-gradient(circle at top left, rgba(66,226,244,0.20), transparent 60%),
        radial-gradient(circle at bottom right, rgba(15,23,42,0.98), rgba(2,6,23,0.98));
      box-shadow: var(--shadow-glow-primary);
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
      font-family: "Geist Mono", "IBM Plex Mono", ui-monospace, monospace;
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
        <div class="app-title">PRISM APEX – A2 MOCK</div>
        <div class="app-subtitle">Worklist · Market · Strategy Lab (Satoshi + Geist Mono)</div>
      </div>
      <div class="header-right">
        <div class="pill">
          <span class="pill-dot"></span>
          <span>A2 · Ultra-Modern Fintech Glow</span>
        </div>
        <div class="view-toggle-group">
          <button class="view-toggle is-active" data-view="worklist">Worklist</button>
          <button class="view-toggle" data-view="market">Market</button>
          <button class="view-toggle" data-view="lab">Strategy Lab</button>
        </div>
      </div>
    </header>

    <main class="shell-body">
      <div class="meta-bar">
        <span>Strategies: <strong>ORR / OSB / VWAP-FT</strong> · Symbols: <strong>ES / NQ / CL</strong></span>
        <span>View: <strong id="view-label">Worklist (pre-trade tickets)</strong></span>
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
              <span class="chip chip-score is-clickable">
                <span class="chip-dot"></span>
                Score ≥ 85
              </span>
              <span class="chip chip-risk-green is-clickable">
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
            <table class="worklist-table mono">
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
                  <td>94<span style="font-size:10px;color:var(--text-muted);">★</span></td>
                  <td class="trend-up">↑</td>
                  <td>ORR</td>
                  <td><span class="risk-green">G</span></td>
                  <td>2</td>
                  <td>4522.50</td>
                  <td>-8t</td>
                  <td>+16t</td>
                  <td>2.0</td>
                  <td style="font-size:10px;color:var(--text-secondary);">
                    TrendUp · VWAP+ · OR Out
                  </td>
                  <td class="trend-up">↗</td>
                  <td class="timer-hot">28m</td>
                  <td><div class="sparkline"></div></td>
                </tr>
                <tr>
                  <td>92</td>
                  <td class="trend-up">↑</td>
                  <td>VWFT</td>
                  <td><span class="risk-green">G</span></td>
                  <td>1</td>
                  <td>15308.00</td>
                  <td>-10t</td>
                  <td>+21t</td>
                  <td>2.1</td>
                  <td style="font-size:10px;color:var(--text-secondary);">
                    TrendUp · VWAP- · OR In
                  </td>
                  <td class="trend-up">↗</td>
                  <td class="timer-warm">17m</td>
                  <td><div class="sparkline"></div></td>
                </tr>
                <tr>
                  <td>88</td>
                  <td class="trend-flat">→</td>
                  <td>OSB</td>
                  <td><span class="risk-amber">A</span></td>
                  <td>1</td>
                  <td>987.80</td>
                  <td>-6t</td>
                  <td>+12t</td>
                  <td>1.9</td>
                  <td style="font-size:10px;color:var(--text-secondary);">
                    TrendDn · VWAP+ · OR Out
                  </td>
                  <td class="trend-flat">↔</td>
                  <td class="timer-warm">12m</td>
                  <td><div class="sparkline"></div></td>
                </tr>
                <tr>
                  <td>86</td>
                  <td class="trend-down">↓</td>
                  <td>VWFT</td>
                  <td><span class="risk-green">G</span></td>
                  <td>1</td>
                  <td>78.40</td>
                  <td>-7t</td>
                  <td>+14t</td>
                  <td>2.0</td>
                  <td style="font-size:10px;color:var(--text-secondary);">
                    Chop · VWAP+ · OR Mid
                  </td>
                  <td class="trend-down">↘</td>
                  <td class="timer-cold">9m</td>
                  <td><div class="sparkline"></div></td>
                </tr>
                <tr>
                  <td>83</td>
                  <td class="trend-down">↓</td>
                  <td>ORR</td>
                  <td><span class="risk-amber">A</span></td>
                  <td>2</td>
                  <td>4514.25</td>
                  <td>-10t</td>
                  <td>+18t</td>
                  <td>1.8</td>
                  <td style="font-size:10px;color:var(--text-secondary);">
                    TrendDn · VWAP- · OR In
                  </td>
                  <td class="trend-down">↘</td>
                  <td class="timer-cold">5m</td>
                  <td><div class="sparkline"></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- MARKET VIEW -->
      <section id="view-market" class="view">
        <div class="section-title">Market · Context for Current Signals</div>

        <div class="market-top-controls">
          <div class="control-left">
            <div class="control-pill control-pill-strong">
              <span class="toggle-dot"></span>
              <span class="mono">ES · 1m</span>
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
                <div class="market-chart-label mono">1m Candles · VWAP / OR / ATR · ES · Synthetic</div>
                <div class="market-chart-legend">
                  <span class="legend-item mono">
                    <span class="legend-swatch"></span> VWAP
                  </span>
                  <span class="legend-item mono">
                    <span class="legend-swatch legend-swatch-or"></span> OR High/Low
                  </span>
                  <span class="legend-item mono">
                    <span class="legend-swatch legend-swatch-atr"></span> ATR Bands
                  </span>
                </div>
              </div>

              <div class="market-signals-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <span style="font-size:11px;color:var(--text-secondary);">Last Signals (ES)</span>
                  <span style="font-size:10px;color:var(--text-muted);">Linked to Worklist / Tickets</span>
                </div>
                <div style="overflow-x:auto;">
                  <table class="mini-table mono">
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
                        <td><span class="risk-green">GREEN</span></td>
                        <td><span class="status-pill">ACTIONABLE</span></td>
                        <td>4522.50</td>
                        <td>-8t</td>
                        <td>+16t</td>
                      </tr>
                      <tr class="mini-row">
                        <td>09:49:22</td>
                        <td>VWFT</td>
                        <td>90</td>
                        <td><span class="risk-green">GREEN</span></td>
                        <td><span class="status-pill">ACTIONABLE</span></td>
                        <td>15308.00</td>
                        <td>-10t</td>
                        <td>+21t</td>
                      </tr>
                      <tr class="mini-row">
                        <td>09:46:03</td>
                        <td>OSB</td>
                        <td>82</td>
                        <td><span class="risk-amber">AMBER</span></td>
                        <td><span class="status-pill">CONDITIONAL</span></td>
                        <td>987.80</td>
                        <td>-6t</td>
                        <td>+12t</td>
                      </tr>
                      <tr class="mini-row">
                        <td>09:41:45</td>
                        <td>ORR</td>
                        <td>78</td>
                        <td><span class="risk-amber">AMBER</span></td>
                        <td><span class="status-pill status-pill-expired">EXPIRED</span></td>
                        <td>4514.25</td>
                        <td>-10t</td>
                        <td>+18t</td>
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
              <div class="market-context-grid mono">
                <div class="context-card">
                  <div class="context-title">Session Metrics</div>
                  <div class="context-line">
                    <span>OR Width</span><span class="context-value">12.50</span>
                  </div>
                  <div class="context-line">
                    <span>OR Mid</span><span class="context-value">4518.25</span>
                  </div>
                  <div class="context-line">
                    <span>VWAP</span><span class="context-value">4520.75</span>
                  </div>
                  <div class="context-line">
                    <span>VWAP Slope</span><span class="context-value">+0.32</span>
                  </div>
                </div>
                <div class="context-card">
                  <div class="context-title">Volatility & Regime</div>
                  <div class="context-line">
                    <span>ATR (14)</span><span class="context-value">6.20</span>
                  </div>
                  <div class="context-line">
                    <span>Regime</span><span class="context-value">Trend Up</span>
                  </div>
                  <div class="context-line">
                    <span>OR Breakout</span><span class="context-value">Above</span>
                  </div>
                  <div class="context-line">
                    <span>Vol State</span><span class="context-value">High</span>
                  </div>
                </div>
                <div class="context-card">
                  <div class="context-title">Active Strategies</div>
                  <div class="context-line">
                    <span>ORR</span><span class="context-value">Enabled</span>
                  </div>
                  <div class="context-line">
                    <span>OSB</span><span class="context-value">Enabled</span>
                  </div>
                  <div class="context-line">
                    <span>VWAP-FT</span><span class="context-value">Enabled</span>
                  </div>
                  <div class="context-line">
                    <span>Filters</span><span class="context-value">Apex-compliant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- STRATEGY LAB VIEW -->
      <section id="view-lab" class="view">
        <div class="section-title">Strategy Lab · Config + Backtest Impact</div>

        <div class="layout-grid-lab">
          <!-- LEFT COLUMN -->
          <section class="column">
            <div class="card">
              <div class="config-list-header">
                <div class="config-list-title">Config Sets</div>
                <div class="config-add">+ Duplicate</div>
              </div>
              <div class="config-set-list">
                <div class="config-item config-item-active">
                  <div>
                    <div class="config-name mono">ORR_ES_D1</div>
                    <div class="config-meta">Active · Updated 09:52</div>
                  </div>
                  <div class="config-state-chip">Active · 3 pending</div>
                </div>
                <div class="config-item">
                  <div>
                    <div class="config-name mono">ORR_NQ_H1</div>
                    <div class="config-meta">Idle · Updated 08:13</div>
                  </div>
                  <div class="config-meta">Prod-compatible</div>
                </div>
                <div class="config-item">
                  <div>
                    <div class="config-name mono">OSB_ES_15m</div>
                    <div class="config-meta">Draft · Sim only</div>
                  </div>
                  <div class="config-meta">5 suggestions</div>
                </div>
                <div class="config-item">
                  <div>
                    <div class="config-name mono">VWFT_CL_D1</div>
                    <div class="config-meta">Idle · Backtest heavy</div>
                  </div>
                  <div class="config-meta">Needs review</div>
                </div>
              </div>

              <div class="suggestions-header">
                <div class="suggestions-title">Suggestions</div>
                <div class="suggestion-pill">! Engine: 3 pending diffs</div>
              </div>

              <div class="suggestion-list">
                <div class="suggestion-row">
                  <div>
                    <div class="suggestion-field mono">rrBandMin</div>
                    <div style="font-size:10px;color:var(--text-muted);">1.3 → 1.5 on TrendUp</div>
                  </div>
                  <div class="suggestion-impact">Sharpen entries</div>
                </div>
                <div class="suggestion-row">
                  <div>
                    <div class="suggestion-field mono">contracts</div>
                    <div style="font-size:10px;color:var(--text-muted);">2 → 1 in Chop / Low ATR</div>
                  </div>
                  <div class="suggestion-impact">Lower drawdown</div>
                </div>
                <div class="suggestion-row">
                  <div>
                    <div class="suggestion-field mono">ATRFactor</div>
                    <div style="font-size:10px;color:var(--text-muted);">1.0 → 1.2 on high vol</div>
                  </div>
                  <div class="suggestion-impact">Vol-fit stops</div>
                </div>
              </div>
            </div>
          </section>

          <!-- MIDDLE COLUMN -->
          <section class="column">
            <div class="editor-card">
              <div class="editor-header">
                <div class="editor-title-block">
                  <div class="editor-title mono">ORR_ES_D1 · Parameters</div>
                  <div class="editor-subtitle">Change tracking · backtest-driven · Apex guardrails aware.</div>
                </div>
                <div class="editor-changes-pill">
                  <span style="width:7px;height:7px;border-radius:999px;background:var(--accent-primary);box-shadow:0 0 10px rgba(66,226,244,0.9);"></span>
                  <span>3 pending fields</span>
                </div>
              </div>

              <div class="editor-table-wrap">
                <table class="editor-table mono">
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
                <div>
                  Window: last 60 RTH sessions · ES ORR · Apex risk constraints applied.
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
          <section class="column column-right-lab">
            <div class="backtest-card">
              <div class="backtest-header">
                <div>
                  <div class="backtest-title">Backtest Results</div>
                  <div class="backtest-meta mono">ES · ORR · last 60 sessions</div>
                </div>
                <div style="font-size:10px;color:var(--accent-primary);">Simulated · Config diff applied</div>
              </div>

              <div class="backtest-metrics mono">
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
              <div class="scenario-list mono">
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
      </section>
    </main>
  </div>
</div>

<script>
  (function() {
    const buttons = document.querySelectorAll(".view-toggle");
    const views = {
      worklist: document.getElementById("view-worklist"),
      market: document.getElementById("view-market"),
      lab: document.getElementById("view-lab")
    };
    const label = document.getElementById("view-label");

    function setView(name) {
      Object.keys(views).forEach(key => {
        views[key].classList.toggle("is-active", key === name);
      });
      buttons.forEach(btn => {
        btn.classList.toggle("is-active", btn.dataset.view === name);
      });
      if (name === "market") {
        label.textContent = "Market (context for current signals)";
      } else if (name === "lab") {
        label.textContent = "Strategy Lab (config + backtest impact)";
      } else {
        label.textContent = "Worklist (pre-trade tickets)";
      }
      try {
        window.localStorage.setItem("pa-view", name);
      } catch (e) {}
    }

    buttons.forEach(btn => {
      btn.addEventListener("click", () => setView(btn.dataset.view));
    });

    let saved = null;
    try {
      saved = window.localStorage.getItem("pa-view");
    } catch (e) {}
    setView(saved && views[saved] ? saved : "worklist");
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
  console.log("=== Prism A2 three-view mock v3 running at http://localhost:" + PORT + " ===");
});
EON

echo "=== STARTING PRISM A2 THREE-VIEW MOCK v3 SERVER ON http://localhost:3200 ==="
node server.js
