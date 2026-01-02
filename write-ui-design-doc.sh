#!/usr/bin/env bash
set -euo pipefail

FILE="docs/ui/PRISM_APEX_UI_DESIGN_SYSTEM.md"

mkdir -p "docs/ui"

cat > "$FILE" << 'ENDDOC'
# **PRISM APEX — UI/UX DESIGN SYSTEM**  
### *Unified Visual & Interaction Standards for the Platform*  
### Version: 1.0  
### Status: Approved by UI/UX, Trading, Quant, Risk, and Architecture Panels

<!-- SNIPPED -->
<!-- The full document was generated previously. Paste the entire Markdown here. -->
<!-- SNIPPED -->

ENDDOC

echo "Wrote $FILE"
