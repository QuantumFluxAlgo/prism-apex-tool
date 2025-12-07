#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – WORKLIST V2 A3 VISUAL TWEAK (V2) ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo "--- Patching WorklistV2.tsx (remove 'Execution' label, ensure CSS import) ---"

node <<'NODE'
const fs = require('fs');
const path = 'apps/dashboard/src/pages/WorklistV2.tsx';
let src = fs.readFileSync(path, 'utf8');
let changed = false;

// 1) Remove the "Execution" label row if present
const execLabelRe = /<p className="text-xs[^>]*>Execution<\/p>\s*/m;
if (execLabelRe.test(src)) {
  src = src.replace(execLabelRe, '');
  console.log('• Removed "Execution" label from Worklist header.');
  changed = true;
} else {
  console.log('• "Execution" label not found (already removed?)');
}

// 2) Ensure worklist-a3.css import exists
if (!src.includes("styles/worklist-a3.css")) {
  const marker = "import Badge from '../ui/Badge';";
  if (!src.includes(marker)) {
    console.error('ERROR: import marker not found; cannot insert worklist-a3.css import.');
    process.exit(1);
  }
  src = src.replace(marker, `${marker}\nimport '../styles/worklist-a3.css';`);
  console.log('• Inserted worklist-a3.css import.');
  changed = true;
} else {
  console.log('• worklist-a3.css already imported; leaving as-is.');
}

if (changed) {
  fs.writeFileSync(path, src);
  console.log('✔ WorklistV2.tsx updated.');
} else {
  console.log('✔ WorklistV2.tsx unchanged (already in desired state).');
}
NODE

echo "--- Writing apps/dashboard/src/styles/worklist-a3.css ---"

cat <<'CSS' > apps/dashboard/src/styles/worklist-a3.css
/* PRISM APEX – Worklist V2 A3 visual theme (v2)
 *
 * Scope: WorklistV2Page only.
 * - Ultra-modern glass surface
 * - Strong signal emphasis
 * - No grid "crosses"
 * - Fully contained, no impact on other pages
 */

.worklist-v2-root {
  position: relative;
  isolation: isolate;
  animation: worklist-v2-fade-in 420ms ease-out;
}

/* HEADER – glass banner, no crosses */

.worklist-v2-header {
  position: relative;
  overflow: hidden;
  border-radius: 1.75rem;
  padding: 1.25rem 1.8rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background:
    radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.18), transparent 60%),
    radial-gradient(circle at 100% 0%, rgba(94, 234, 212, 0.14), transparent 55%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.92));
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.95),
    0 0 0 1px rgba(15, 23, 42, 0.9),
    0 0 25px rgba(56, 189, 248, 0.35);
}

.worklist-v2-header::before {
  content: '';
  position: absolute;
  inset: 0;
  mix-blend-mode: soft-light;
  background:
    linear-gradient(90deg, rgba(148, 163, 184, 0.08), transparent 40%, transparent 60%, rgba(248, 250, 252, 0.12)),
    linear-gradient(0deg, rgba(148, 163, 184, 0.04), transparent 50%, rgba(15, 23, 42, 0.9));
  opacity: 0.9;
  pointer-events: none;
}

.worklist-v2-header > * {
  position: relative;
  z-index: 1;
}

/* Make the H1 / copy breathe a bit more */

.worklist-v2-header h1 {
  letter-spacing: 0.08em;
}

.worklist-v2-header p.text-sm {
  max-width: 46rem;
}

/* FILTER BAR – compact glass strip */

.worklist-v2-filters {
  position: relative;
  border-radius: 1.4rem;
  padding: 0.9rem 1.25rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.93));
  box-shadow:
    0 14px 32px rgba(15, 23, 42, 0.9),
    0 0 0 1px rgba(15, 23, 42, 0.9);
}

.worklist-v2-filters::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(56, 189, 248, 0.15);
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms ease-out;
}

.worklist-v2-filters:hover::before {
  opacity: 1;
}

/* Search pill */

.worklist-v2-filters input[type='search'] {
  border-radius: 999px;
  padding-inline: 0.9rem;
  padding-block: 0.4rem;
  background: radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.95));
  border: 1px solid rgba(148, 163, 184, 0.55);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.9);
  transition:
    border-color 160ms ease-out,
    box-shadow 160ms ease-out,
    background 160ms ease-out;
}

.worklist-v2-filters input[type='search']:focus-visible {
  outline: none;
  border-color: rgba(56, 189, 248, 0.85);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.9),
    0 0 0 1.5px rgba(56, 189, 248, 0.7),
    0 0 18px rgba(56, 189, 248, 0.45);
}

/* MAIN LAYOUT – wider grid, cleaner alignment */

.worklist-v2-root > div.flex {
  align-items: stretch;
  gap: 1.75rem;
}

/* Left panel – table */

.panel.worklist-v2-panel {
  border-radius: 1.6rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background:
    radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.22), transparent 60%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.96));
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.95),
    0 0 0 1px rgba(15, 23, 42, 0.9);
  animation: worklist-v2-panel-rise 420ms ease-out;
}

.worklist-v2-panel .panel-header {
  padding-inline: 1.25rem;
  padding-block: 0.9rem;
  border-bottom: 1px solid rgba(51, 65, 85, 0.9);
}

.worklist-v2-panel .panel-body {
  padding: 0.8rem 1rem 1rem;
}

/* DataTable container */

.worklist-v2-table {
  border-radius: 1.1rem;
  overflow: hidden;
  background: radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.98));
  box-shadow:
    inset 0 0 0 1px rgba(30, 64, 175, 0.75),
    0 12px 30px rgba(15, 23, 42, 0.9);
}

/* Header row */

.worklist-v2-table table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.worklist-v2-table thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.94));
}

.worklist-v2-table thead th {
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 0.55rem 0.4rem;
  color: rgba(148, 163, 184, 0.9);
  border-bottom: 1px solid rgba(51, 65, 85, 0.95);
}

/* Row buttons – signal tiles */

.worklist-v2-table tbody tr td {
  padding: 0.25rem 0.4rem;
}

.worklist-v2-table button {
  border-radius: 0.9rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid rgba(15, 23, 42, 0.9);
  background:
    radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.98));
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.95);
  transition:
    transform 140ms ease-out,
    border-color 140ms ease-out,
    box-shadow 140ms ease-out,
    background 140ms ease-out,
    color 140ms ease-out;
}

.worklist-v2-table button:hover {
  transform: translateY(-1px);
  border-color: rgba(56, 189, 248, 0.7);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.95),
    0 8px 18px rgba(8, 47, 73, 0.8),
    0 0 18px rgba(56, 189, 248, 0.4);
  background:
    radial-gradient(circle at 0% 0%, rgba(8, 47, 73, 0.96), rgba(15, 23, 42, 0.98));
}

/* Selected state – piggyback on existing cyan border/shadow */

.worklist-v2-table button[class*='shadow-[0_0_14px_rgba(66,226,244,0.35)]'] {
  transform: translateY(-1px);
  border-color: rgba(56, 189, 248, 0.9);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.95),
    0 0 22px rgba(56, 189, 248, 0.7);
}

/* DETAILS PANEL – glass console */

.panel.worklist-v2-details {
  border-radius: 1.6rem;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background:
    radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.14), transparent 55%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.96));
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.96),
    0 0 0 1px rgba(15, 23, 42, 0.9);
  animation: worklist-v2-panel-rise 420ms ease-out;
}

.worklist-v2-details .details-header {
  border-bottom: 1px solid rgba(51, 65, 85, 0.9);
  padding: 0.9rem 1rem 0.65rem;
}

.worklist-v2-details .details-header h2 {
  font-size: 0.8rem;
  letter-spacing: 0.18em;
}

.worklist-v2-details .details-header span {
  font-size: 0.7rem;
  color: rgba(148, 163, 184, 0.9);
}

.worklist-v2-details .details-body {
  padding: 0.8rem 0.9rem 1rem;
}

/* Detail sections as mini glass cards */

.worklist-v2-details .details-section {
  border-radius: 1rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid rgba(30, 64, 175, 0.75);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.99));
  box-shadow:
    0 8px 18px rgba(15, 23, 42, 0.95),
    0 0 0 1px rgba(15, 23, 42, 0.9);
}

.worklist-v2-details .details-label {
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.9);
}

/* Empty-state card in details */

.worklist-v2-details .details-body > div.rounded-xl {
  border-radius: 1rem;
  border-style: dashed;
  border-color: rgba(148, 163, 184, 0.6);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.96));
}

/* Animations */

@keyframes worklist-v2-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes worklist-v2-panel-rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
CSS

echo "--- Running dashboard tests ---"
pnpm --filter prism-apex-dashboard test
