#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – APPLYING WORKLIST V2 A3 VISUALS (CSS-ONLY) ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo "--- Ensuring WorklistV2.tsx imports worklist-a3.css ---"
node <<'NODE'
const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'apps', 'dashboard', 'src', 'pages', 'WorklistV2.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes("styles/worklist-a3.css")) {
  console.log("WorklistV2.tsx already imports worklist-a3.css; nothing to do.");
  process.exit(0);
}

const marker = "import Badge from '../ui/Badge';";

if (!src.includes(marker)) {
  console.error("Marker import not found in WorklistV2.tsx; aborting CSS import injection.");
  process.exit(1);
}

src = src.replace(
  marker,
  marker + "\nimport '../styles/worklist-a3.css';"
);

fs.writeFileSync(file, src);
console.log("Injected worklist-a3.css import into WorklistV2.tsx.");
NODE

echo "--- Writing apps/dashboard/src/styles/worklist-a3.css ---"
cat <<'CSS' > apps/dashboard/src/styles/worklist-a3.css
/* Worklist V2 — A3 high-end neon/glass skin.
 *
 * Scope: Worklist only.
 * We assume the component root is <section class="worklist-v2-root"> and
 * the table wrapper is .worklist-v2-table, with .worklist-v2-panel and
 * .worklist-v2-details for the two main panels.
 */

.worklist-v2-root {
  --wl-bg: #020617;
  --wl-panel-bg: rgba(15, 23, 42, 0.98);
  --wl-glass-bg: rgba(15, 23, 42, 0.88);
  --wl-border-soft: rgba(148, 163, 184, 0.4);
  --wl-border-strong: rgba(56, 189, 248, 0.85);
  --wl-accent-cyan: rgba(34, 211, 238, 1);
  --wl-accent-indigo: rgba(129, 140, 248, 1);
  --wl-radius-xl: 1.75rem;

  font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif;
  color: #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  animation: worklist-fade-in 260ms ease-out both;
}

@keyframes worklist-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

/* --- Header: glass banner with radial teal/indigo glow & subtle grid --- */

.worklist-v2-root > header {
  position: relative;
  border-radius: var(--wl-radius-xl);
  border: 1px solid rgba(148, 163, 184, 0.5);
  background:
    radial-gradient(circle at 0% 0%, rgba(45, 212, 191, 0.16), transparent 60%),
    radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.18), transparent 55%),
    radial-gradient(circle at 50% 100%, rgba(129, 140, 248, 0.18), transparent 55%),
    linear-gradient(135deg, #020617 0%, #020617 30%, #020617 60%, #020617 100%);
  box-shadow:
    0 32px 80px rgba(15, 23, 42, 0.95),
    0 0 32px rgba(56, 189, 248, 0.22);
  overflow: hidden;
}

.worklist-v2-root > header::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.5), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(129, 140, 248, 0.4), transparent 60%);
  mix-blend-mode: screen;
  opacity: 0.35;
  pointer-events: none;
}

.worklist-v2-root > header::after {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: calc(var(--wl-radius-xl) - 2px);
  background-image:
    linear-gradient(to right, rgba(15, 23, 42, 0.8) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15, 23, 42, 0.9) 1px, transparent 1px);
  background-size: 32px 32px;
  opacity: 0.7;
  mix-blend-mode: soft-light;
  pointer-events: none;
}

/* --- Filters: compact glass card with glow on hover/focus --- */

.worklist-v2-filters {
  position: relative;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.9);
  background:
    radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.18), transparent 55%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.96));
  box-shadow:
    0 16px 40px rgba(15, 23, 42, 0.95),
    0 0 20px rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(22px) saturate(1.3);
  -webkit-backdrop-filter: blur(22px) saturate(1.3);
}

.worklist-v2-filters::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(56, 189, 248, 0.45);
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease-out;
}

.worklist-v2-filters:hover::before,
.worklist-v2-filters:focus-within::before {
  opacity: 0.9;
}

.worklist-v2-filters input[type="search"] {
  border-radius: 999px !important;
}

/* --- Panels: wide glass shells for table + details --- */

.worklist-v2-panel,
.worklist-v2-details {
  border-radius: var(--wl-radius-xl);
  background:
    radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 1)),
    radial-gradient(circle at 100% 100%, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 1));
  border: 1px solid rgba(30, 64, 175, 0.75);
  box-shadow:
    0 28px 70px rgba(15, 23, 42, 0.98),
    0 0 22px rgba(15, 23, 42, 0.96);
}

.worklist-v2-panel {
  animation: worklist-panel-rise 260ms ease-out both;
}

.worklist-v2-details {
  position: sticky;
  top: 0.75rem;
  will-change: transform, box-shadow;
  transition:
    transform 160ms ease-out,
    box-shadow 160ms ease-out;
  animation: worklist-panel-rise 300ms ease-out both;
}

.worklist-v2-details:hover {
  transform: translateY(-1px);
  box-shadow:
    0 26px 60px rgba(15, 23, 42, 0.98),
    0 0 22px rgba(56, 189, 248, 0.25);
}

@keyframes worklist-panel-rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* --- Table container: glass well + custom scrollbars --- */

.worklist-v2-table {
  border-radius: 1.5rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 1)),
    radial-gradient(circle at 100% 100%, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 1));
  box-shadow:
    inset 0 0 0 1px rgba(15, 23, 42, 0.95),
    0 22px 50px rgba(15, 23, 42, 0.96);
  scrollbar-width: thin;
  scrollbar-color: rgba(56, 189, 248, 0.75) rgba(15, 23, 42, 0.95);
}

.worklist-v2-table::-webkit-scrollbar {
  width: 6px;
}

.worklist-v2-table::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.96);
}

.worklist-v2-table::-webkit-scrollbar-thumb {
  background: linear-gradient(
    to bottom,
    rgba(56, 189, 248, 0.9),
    rgba(56, 189, 248, 0.4)
  );
  border-radius: 999px;
}

/* --- Table layout & sticky header --- */

.worklist-v2-table table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.65rem;
}

.worklist-v2-table thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 0.75rem 0.75rem;
  background: linear-gradient(
    to right,
    rgba(15, 23, 42, 0.98),
    rgba(15, 23, 42, 0.97)
  );
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(148, 163, 184, 0.9);
  border-bottom: 1px solid rgba(51, 65, 85, 0.9);
}

.worklist-v2-table thead tr:first-child th:first-child {
  border-top-left-radius: 1rem;
}

.worklist-v2-table thead tr:first-child th:last-child {
  border-top-right-radius: 1rem;
}

.worklist-v2-table tbody tr td {
  padding: 0;
  border: none;
}

/* --- Signal tiles (row buttons) with neon hover/selected states --- */

.worklist-v2-table button {
  border-radius: 1rem;
  border: 1px solid rgba(15, 23, 42, 0.95);
  background:
    radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 1)),
    radial-gradient(circle at 120% -20%, rgba(56, 189, 248, 0.22), transparent 60%);
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.95),
    0 18px 44px rgba(15, 23, 42, 1);
  transform: translateY(0);
  transition:
    transform 140ms ease-out,
    box-shadow 160ms ease-out,
    border-color 160ms ease-out,
    background 180ms ease-out,
    filter 180ms ease-out;
}

.worklist-v2-table button:hover {
  transform: translateY(-1px);
  border-color: rgba(56, 189, 248, 0.85);
  background:
    radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.16), rgba(15, 23, 42, 1)),
    radial-gradient(circle at 120% -20%, rgba(129, 140, 248, 0.25), transparent 65%);
  box-shadow:
    0 0 0 1px rgba(56, 189, 248, 0.65),
    0 22px 52px rgba(15, 23, 42, 1),
    0 0 32px rgba(56, 189, 248, 0.45);
  filter: saturate(1.15);
}

.worklist-v2-table button:focus-visible {
  outline: 2px solid rgba(56, 189, 248, 0.9);
  outline-offset: 0;
}

/* Selected row: rely on the Tailwind class border-cyan-300/90 present when active */
.worklist-v2-table button[class*="border-cyan-300"] {
  border-color: rgba(56, 189, 248, 0.95);
  box-shadow:
    0 0 0 1px rgba(56, 189, 248, 0.9),
    0 24px 60px rgba(15, 23, 42, 1),
    0 0 36px rgba(56, 189, 248, 0.65);
  filter: saturate(1.18);
}

/* --- Details console: glass cards with neon underline on header --- */

.details-header {
  position: relative;
}

.details-header::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(
    to right,
    rgba(56, 189, 248, 0.4),
    rgba(129, 140, 248, 0.3),
    rgba(56, 189, 248, 0.4)
  );
  opacity: 0.9;
}

.details-section {
  border-radius: 1rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 1)),
    radial-gradient(circle at 100% 100%, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 1));
  border: 1px solid rgba(30, 64, 175, 0.75);
  box-shadow:
    0 16px 40px rgba(15, 23, 42, 0.95),
    0 0 16px rgba(15, 23, 42, 0.95);
}

.details-section + .details-section {
  margin-top: 0.75rem;
}

.details-label {
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.9);
}

.details-body {
  /* The React markup uses .details-body as a wrapper; keep it clean. */
}

/* Make the "no ticket selected" placeholder feel like a proper empty state card */
.worklist-v2-details .border-dashed {
  border-radius: 1.25rem;
}
CSS

echo "--- Running dashboard tests ---"
pnpm --filter prism-apex-dashboard test
