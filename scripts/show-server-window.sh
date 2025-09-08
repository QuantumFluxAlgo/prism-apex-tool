#!/usr/bin/env bash
set -euo pipefail
nl -ba apps/api/src/server.ts | sed -n '110,180p'
