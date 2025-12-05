#!/usr/bin/env bash
set -euo pipefail

FILE="apps/dashboard/src/pages/WorklistV2.tsx"
TS="$(date +%Y%m%d%H%M%S)"
cp "$FILE" "${FILE}.bak.${TS}"

python3 <<'PY'
from pathlib import Path

path = Path("apps/dashboard/src/pages/WorklistV2.tsx")
text = path.read_text()

text = text.replace(
    'className="worklist-v2-header rounded-3xl border border-slate-800 bg-slate-900/70 p-5 text-slate-100 shadow-xl"',
    'className="worklist-v2-header px-6 py-5"'
)

text = text.replace(
    'className="worklist-v2-filters rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg backdrop-blur"',
    'className="worklist-v2-filters px-4 pt-3 pb-4"'
)

old = """function renderRowCell(\n  ticket: EnrichedTicket,\n  selectedId: string | null,\n  onSelect: (id: string) => void,\n  content: React.ReactNode,\n) {\n  const active = selectedId === ticket.id;\n  return (\n    <button\n      type=\"button\"\n      onClick={() => onSelect(ticket.id)}\n      className={`w-full rounded-lg border border-transparent bg-slate-900/20 px-2 py-2 text-left text-sm text-slate-200 transition hover:border-cyan-400/40 hover:bg-slate-900/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${\n        active ? 'border-cyan-400/70 bg-slate-900/70 shadow-[0_0_14px_rgba(66,226,244,0.35)]' : ''\n      }`}\n    >\n      {content}\n    </button>\n  );\n}\n"""

new = """function renderRowCell(\n  ticket: EnrichedTicket,\n  selectedId: string | null,\n  onSelect: (id: string) => void,\n  content: React.ReactNode,\n) {\n  const active = selectedId === ticket.id;\n\n  return (\n    <button\n      type=\"button\"\n      onClick={() => onSelect(ticket.id)}\n      className={[\n        'w-full text-left text-[11px] leading-tight transition-colors',\n        'bg-transparent text-[var(--text-secondary)]',\n        'hover:bg-[rgba(19,23,43,0.9)] hover:text-[var(--text-primary)]',\n        'focus:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(66,226,244,0.7)]',\n        active\n          ? 'bg-[rgba(66,226,244,0.16)] text-[var(--text-primary)] border border-[rgba(66,226,244,0.8)] shadow-[0_0_18px_rgba(66,226,244,0.55)] rounded-md'\n          : 'border border-transparent rounded-md',\n      ].join(' ')}\n    >\n      {content}\n    </button>\n  );\n}\n"""

if old not in text:
    raise SystemExit("Original renderRowCell block not found")

text = text.replace(old, new)

path.write_text(text)
PY

echo "Patched WorklistV2.tsx (backup at ${FILE}.bak.${TS})"
