#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – Worklist V2 HTML mock alignment ==="

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

ts="$(date +%Y%m%d%H%M%S)"

echo "--- Backing up existing files ---"
cp apps/dashboard/src/styles/a2.css "apps/dashboard/src/styles/a2.css.bak.${ts}"
cp apps/dashboard/src/pages/WorklistV2.tsx "apps/dashboard/src/pages/WorklistV2.tsx.bak.${ts}"

echo "--- Rewriting apps/dashboard/src/styles/a2.css to match HTML mock ---"
cat <<'CSS' > apps/dashboard/src/styles/a2.css
/* PRISM APEX — A2 layout + panel system (Worklist V2 aligned to HTML mock)
 *
 * Key goals:
 * - Two-column layout: table + 360px detail panel
 * - Flat, bordered rows (no neon card per cell)
 * - Column widths mirror the mock grid
 * - Uses dashboard tokens from index.css (bg/text/border/accent)
 */

/* Root container under ExecutionShell */
.worklist-v2-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* Page header just under the ExecutionShell */
.worklist-v2-header {
  border-radius: 20px;
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-soft);
}

/* Filters bar container (uses React FiltersBar inside) */
.worklist-v2-filters {
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Core Worklist layout: table + details panel */
.layout-two {
  display: flex;
  align-items: stretch;
  gap: 16px;
}

/* Left-hand panel (table) flexes, right-hand details fixed to ~mock width */
.layout-two > .panel {
  flex: 1 1 auto;
}

.layout-two > .details-panel {
  flex: 0 0 360px;
}

/* On smaller screens we fall back to a single column */
@media (max-width: 1024px) {
  .layout-two {
    flex-direction: column;
  }

  .layout-two > .details-panel {
    flex: 0 0 auto;
  }
}

/* Generic panel shell (used by Worklist table and details) */
.panel {
  border-radius: 16px;
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}

/* Panel header/body styling taken from A2 mock */
.panel-header {
  display: flex;
  aligners: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background-color: var(--bg-header);
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

/* === Worklist table styling (approximate the HTML grid mock) === */

.worklist-v2-table table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  background-color: var(--bg-panel);
}

.worklist-v2-table thead {
  background-color: var(--bg-header);
}

.worklist-v2-table th,
.worklist-v2-table td {
  padding: 6px 8px;
  font-size: 11px;
  border-bottom: 1px solid var(--border-subtle);
}

.worklist-v2-table th {
  text-align: left;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Flat rows, light banding and hover (no big cards per cell) */
.worklist-v2-table tbody tr {
  background-color: transparent;
}

.worklist-v2-table tbody tr:nth-child(even) {
  background-color: rgba(255, 255, 255, 0.01);
}

.worklist-v2-table tbody tr:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

/* Column widths based on HTML grid:
 * [60,40,70,60,52,96,80,88,56,200,56,60,100,70]
 */
.worklist-v2-table th:nth-child(1),
.worklist-v2-table td:nth-child(1) { width: 60px; }

.worklist-v2-table th:nth-child(2),
.worklist-v2-table td:nth-child(2) { width: 40px; }

.worklist-v2-table th:nth-child(3),
.worklist-v2-table td:nth-child(3) { width: 70px; }

.worklist-v2-table th:nth-child(4),
.worklist-v2-table td:nth-child(4) { width: 60px; }

.worklist-v2-table th:nth-child(5),
.worklist-v2-table td:nth-child(5) { width: 52px; }

.worklist-v2-table th:nth-child(6),
.worklist-v2-table td:nth-child(6) { width: 96px; }

.worklist-v2-table th:nth-child(7),
.worklist-v2-table td:nth-child(7) { width: 80px; }

.worklist-v2-table th:nth-child(8),
.worklist-v2-table td:nth-child(8) { width: 88px; }

.worklist-v2-table th:nth-child(9),
.worklist-v2-table td:nth-child(9) { width: 56px; }

.worklist-v2-table th:nth-child(10),
.worklist-v2-table td:nth-child(10) { width: 200px; }

.worklist-v2-table th:nth-child(11),
.worklist-v2-table td:nth-child(11) { width: 56px; }

.worklist-v2-table th:nth-child(12),
.worklist-v2-table td:nth-child(12) { width: 60px; }

.worklist-v2-table th:nth-child(13),
.worklist-v2-table td:nth-child(13) { width: 100px; }

.worklist-v2-table th:nth-child(14),
.worklist-v2-table td:nth-child(14) { width: 70px; }

/* Scroll helper for tall tables */
.scroll-y {
  max-height: 360px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.scroll-y::-webkit-scrollbar {
  width: 6px;
}

.scroll-y::-webkit-scrollbar-thumb {
  background: rgba(118, 138, 210, 0.9);
  border-radius: 999px;
}

/* === A2-style details panel on the right-hand side === */

.details-panel {
  border-radius: 18px;
  background-color: rgba(7, 10, 26, 0.98);
  border: 1px solid rgba(66, 226, 244, 0.35);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.9);
}

.details-header {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background-color: #0b1222;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
}

.details-header h2 {
  margin: 0;
  font-size: 12px;
  color: var(--text-primary);
}

.details-header span {
  font-size: 10px;
  color: var(--text-muted);
}

.details-body {
  padding: 10px 12px 12px;
  font-size: 11px;
  color: var(--text-secondary);
}

/* Detail sections + labels adopted from mock */
.details-section {
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
}

.details-section:first-of-type {
  border-top: none;
  margin-top: 0;
  padding-top: 0;
}

.details-labelzufügen...CSS
