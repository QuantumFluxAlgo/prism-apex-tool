#!/usr/bin/env bash
set -euo pipefail

say(){ printf "\033[1;36m➤ %s\033[0m\n" "$*"; }
ok(){  printf "\033[1;32m✔ %s\033[0m\n" "$*"; }
warn(){ printf "\033[1;33m! %s\033[0m\n" "$*"; }
die(){ printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

DASH_COPY_BTN="apps/dashboard/src/components/CopyOcoButton.tsx"
DASH_WORKLIST="apps/dashboard/src/pages/Worklist.tsx"
DASH_TICKETS="apps/dashboard/src/pages/Tickets.tsx"
DASH_CSS="apps/dashboard/src/index.css"

[ -d apps/dashboard ] || die "Run from repo root; apps/dashboard not found."

if [ -f "$DASH_COPY_BTN" ]; then
  say "Extending CopyOcoButton with Qty…"
  cp "$DASH_COPY_BTN" "${DASH_COPY_BTN}.bak"
  awk '
    BEGIN{inserted=0}
    /export default function|function CopyOcoButton|const CopyOcoButton/ {
      if(!inserted){
        print;
        print "const pickQty = (row: any) => { const op = row?.operatorSizing || row?.operator || row?.operator_sizing; const q = op?.qty ?? op?.quantity; return typeof q === \"number\" && q > 0 ? q : undefined; };";
        inserted=1; next
      }
    }
    {print}
  ' "${DASH_COPY_BTN}.bak" > "$DASH_COPY_BTN"
  awk '
    BEGIN{added=0}
    /const lines = \[/ {inLines=1}
    inLines && $0 ~ /`Entry/ && !added {
      print "      `Qty: ${pickQty(row) ?? \"—\"}`,";
      added=1
    }
    /];/ {inLines=0}
    {print}
  ' "$DASH_COPY_BTN" > "${DASH_COPY_BTN}.tmp" && mv "${DASH_COPY_BTN}.tmp" "$DASH_COPY_BTN"
  ok "CopyOcoButton updated."
else
  warn "Missing $DASH_COPY_BTN"
fi

for file in "$DASH_WORKLIST" "$DASH_TICKETS"; do
  if [ -f "$file" ]; then
    cp "$file" "${file}.bak"
    sed -i '' 's/Tick $/Risk\/ctr $/g; s/Warning[[:space:]]*//g' "$file" || true
    ok "Headers normalized in ${file##*/}"
  else
    warn "Missing $file"
  fi
done

if [ -f "$DASH_CSS" ] && ! grep -q '.operator-col' "$DASH_CSS"; then
  cat >> "$DASH_CSS" <<'CSS'
.operator-col { display:flex; flex-direction:column; gap:2px; }
.operator-col__metrics { display:flex; flex-direction:column; gap:2px; }
.operator-col__badges { font-size:0.75rem; opacity:0.75; }
CSS
  ok "Operator CSS added."
fi

say "Done"
