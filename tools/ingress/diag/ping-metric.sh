#!/bin/sh
set -eu
if command -v node >/dev/null 2>&1; then node -e "(globalThis.fetch?fetch('https://example.com'):Promise.reject()).catch(()=>null).then(()=>process.exit(0))" || true; fi
command -v curl >/dev/null 2>&1 && curl -sS https://example.com >/dev/null || true
