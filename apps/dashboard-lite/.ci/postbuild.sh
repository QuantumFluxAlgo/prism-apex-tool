#!/usr/bin/env bash
set -euo pipefail
rm -rf web-dist
mkdir -p web-dist
cp -r web/dist/* web-dist/
echo "Web assets copied to web-dist/"
