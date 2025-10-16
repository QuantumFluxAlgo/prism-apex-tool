/* Prism-Apex docs refactor tool
 * - Inventories MD
 * - Builds canonical docs from existing content
 * - Moves replaced originals into docs/_archive
 * - Deletes non-canonical MD files
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const CANON = [
  "README.md",
  "TECH-SPEC.md",
  "AGENTS.md",
  "OPERATIONS.md",
  "INTEGRATIONS-TRADOVATE.md",
  "TESTING.md",
  "CONTRIBUTING.md",
  "GLOSSARY.md"
];

const TEMPLATES_DIR = path.join(repoRoot, "docs", "_templates");
const ARCHIVE_DIR = path.join(repoRoot, "docs", "_archive");
const DOCS_DIR = path.join(repoRoot, "docs");

// ensure dirs
fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
fs.mkdirSync(DOCS_DIR, { recursive: true });

// find all markdown files
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".git")) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(md|markdown)$/i.test(entry.name)) out.push(p);
  }
  return out;
}
const allMd = walk(repoRoot);

// collect contents and headings
const docs = allMd.map(p=>{
  const rel = path.relative(repoRoot,p);
  const text = fs.readFileSync(p,"utf8");
  const h1 = (text.match(/^#\s+(.+)$/m)||[])[1]||"";
  return {rel, text, h1};
});

// simple stitch helper: collect sections by likely topic keywords
function collect(regexps) {
  const picked = [];
  for (const d of docs) {
    if (CANON.includes(d.rel)) continue; // avoid current canon files (if any)
    for (const rx of regexps) {
      if (rx.test(d.rel) || rx.test(d.h1) || rx.test(d.text)) { picked.push(d); break; }
    }
  }
  return picked;
}

// Build canonical content (very intentionally simple/structured)
function mdHeader(title, blurb) {
  return `# ${title}\n\n${blurb}\n\n> This page was auto-generated from existing repo docs. Check TODO/TBD markers.\n`;
}

const now = new Date().toISOString();

const blocks = {
  README: [
    mdHeader("Prism-Apex Tool","Operator-assisted trading — tickets-only. Docker-only dev & deploy."),
    "## Quick Start\n",
    "- Docker required\n- `pnpm install --frozen-lockfile`\n- `docker compose up -d`\n- `pnpm docs:lint`\n",
    "## Docs Map\n",
    CANON.filter(f=>f!=="README.md").map(f=>`- [${f}](./${f})`).join("\n"),
    "\n## Non-Negotiables\n- Tickets-only (no API order placement)\n- Protected folders: strategy core, guardrails, infra/CI/CD\n- 12-factor config; structured JSON logs\n"
  ].join("\n"),
  TECH_SPEC: [
    mdHeader("Technical Specification","Reference architecture, modules, data contracts, and guardrails."),
    "## Architecture Overview\n- Tradovate WS → Bars/VWAP/ATR → Strategy Orchestrator (VWAP First-Touch, OSB) → Apex guardrails → Tickets JSONL → Dashboard\n",
    "## Modules\n- Strategy core (protected)\n- Guardrails (rules-apex, protected)\n- Tickets store & dashboard\n- Telemetry (read-only Tradovate REST)\n",
    "## Data Contracts\n- Tickets JSONL schema (TBD fill from existing docs)\n- Env var matrix (TBD)\n",
    "## Quality Bars\n- JS/TS: `pnpm lint && pnpm typecheck && pnpm test`\n- Python: `ruff --fix && black --check && pytest -q`\n"
  ].join("\n"),
  AGENTS: [
    mdHeader("Agents & Automation","What’s automated vs operator-controlled."),
    "## Boundaries\n- Operator copies tickets into Tradovate (manual OCO)\n- No API order placement or liquidation\n",
    "## Workflows\n- Signals → Orchestrator → Guardrails → Ticket issuance → Operator OCO entry\n",
    "## Safety\n- Daily loss halts (Apex)\n- Idempotent signal handling\n"
  ].join("\n"),
  OPERATIONS: [
    mdHeader("Operations (Runbook)","Day-to-day ops, smoke checks, incident playbooks."),
    "## First 5 Minutes\n- `docker compose ps`\n- Health endpoints/metrics (TBD)\n",
    "## Common Tasks\n- Start/stop services\n- Rotate logs\n- Reconcile tickets vs positions\n",
    "## Incidents\n- Token expiry → re-auth\n- WS disconnect → backoff + resubscribe\n- Rate-limit penalty → wait + p-ticket (see Integrations)\n"
  ].join("\n"),
  INTEGRATIONS_TRADOVATE: [
    mdHeader("Integrations — Tradovate","Auth, WS/REST split, rate limits, compliance."),
    "## Environments\n- Demo vs Live endpoints\n- Separate sockets for user-data vs market data\n",
    "## Auth\n- Token via REST; mdAccessToken for MD socket; send `authorize` frame\n- Device ID binding (2FA style)\n",
    "## Market Data\n- Live MD via CME sub-vendor (cost) or use demo/alternate data\n",
    "## Rate Limits\n- Dynamic; penalty time + ticket; backoff + replay\n"
  ].join("\n"),
  TESTING: [
    mdHeader("Testing","Test pyramid and commands."),
    "## Commands\n- `pnpm test -q`\n- `pytest -q`\n",
    "## Strategy\n- Unit tests\n- Golden samples\n- Fixture-based I/O\n"
  ].join("\n"),
  CONTRIBUTING: [
    mdHeader("Contributing","Branching, approvals, protected areas."),
    "## Branching\n- feat|fix|chore/ABC-123-desc\n",
    "## Quality Gates\n- Quick lint + typecheck on write; full tests on APPROVE:RUN\n",
    "## Protected Folders\n- Strategy core, guardrails, infra/CI/CD\n"
  ].join("\n"),
  GLOSSARY: [
    mdHeader("Glossary","Shared terms used across docs."),
    "- VWAP first-touch\n- OSB\n- OCO\n- Tickets store\n- Guardrails (Apex)\n"
  ].join("\n")
};

// Optional: enrich sections from existing docs by keyword routing
function appendFrom(picked, heading) {
  if (!picked.length) return `\n> TBD: No matching content found in existing docs for **${heading}**.\n`;
  const parts = picked.map(d=>`\n---\n**From:** \`${d.rel}\`\n\n${d.text}\n`);
  return parts.join("\n");
}

// Minimal enrichment (safe, no heuristics “rewrites”)
const specSources = collect([/ARCH|TECH|SPEC|VWAP|OSB|guardrail|orchestrator/i]);
blocks.TECH_SPEC += appendFrom(specSources,"Technical details");

const opsSources = collect([/RUNBOOK|OPERATIONS|DEPLOY|README-Docker|README-dev|DEPLOY\.md/i]);
blocks.OPERATIONS += appendFrom(opsSources,"Ops & Deploy");

const tradovateSources = collect([/TRADOVATE|API|INTEGRATION|rate limit|CME|mdAccessToken|WebSocket/i]);
blocks.INTEGRATIONS_TRADOVATE += appendFrom(tradovateSources,"Tradovate Integration");

const testingSources = collect([/TEST|fixture|golden|coverage/i]);
blocks.TESTING += appendFrom(testingSources,"Testing");

const readmeSources = collect([/README|PROJECT|OVERVIEW|docs/i]);
blocks.README += appendFrom(readmeSources,"Overview");

const agentsSources = collect([/agent|automation|tickets|OCO|operator/i]);
blocks.AGENTS += appendFrom(agentsSources,"Agents");

const contribSources = collect([/CONTRIBUTING|quality|lint|typecheck|commit/i]);
blocks.CONTRIBUTING += appendFrom(contribSources,"Contributing");

const glossarySources = collect([/glossary|terms|definitions/i]);
blocks.GLOSSARY += appendFrom(glossarySources,"Glossary");

// Write canonical docs
const outMap = {
  "README.md": blocks.README,
  "TECH-SPEC.md": blocks.TECH_SPEC,
  "AGENTS.md": blocks.AGENTS,
  "OPERATIONS.md": blocks.OPERATIONS,
  "INTEGRATIONS-TRADOVATE.md": blocks.INTEGRATIONS_TRADOVATE,
  "TESTING.md": blocks.TESTING,
  "CONTRIBUTING.md": blocks.CONTRIBUTING,
  "GLOSSARY.md": blocks.GLOSSARY
};
for (const [file, content] of Object.entries(outMap)) {
  fs.writeFileSync(path.join(repoRoot, file), content);
}

// Archive & delete non-canonical MD files
const keep = new Set(CANON);
const toDelete = [];
for (const d of docs) {
  if (keep.has(d.rel)) continue;
  // keep templates and archive
  if (d.rel.startsWith("docs/_templates") || d.rel.startsWith("docs/_archive")) continue;
  // move to archive mirror
  const dest = path.join(ARCHIVE_DIR, d.rel.replace(/\//g,"__"));
  fs.writeFileSync(dest, d.text);
  toDelete.push(d.rel);
}

// actually delete
for (const rel of toDelete) {
  try {
    fs.unlinkSync(path.join(repoRoot, rel));
  } catch {}
}

// Inventory report
const report = {
  timestamp: now,
  created: CANON,
  archived_then_deleted: toDelete,
  archive_dir: path.relative(repoRoot, ARCHIVE_DIR)
};
fs.writeFileSync(path.join(DOCS_DIR, "docs_refactor_report.json"), JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
