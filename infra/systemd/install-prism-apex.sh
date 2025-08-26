#!/usr/bin/env bash
set -euo pipefail

# Defaults
APP_USER="${APP_USER:-prism}"
REPO_DIR="${REPO_DIR:-/home/${APP_USER}/prism-apex-tool}"
DATA_DIR="${DATA_DIR:-/home/${APP_USER}/prism-apex-data}"
ENV_FILE="${ENV_FILE:-/home/${APP_USER}/prism-apex.env}"
SERVICE_SRC="${SERVICE_SRC:-${REPO_DIR}/infra/systemd/prism-apex.service}"

# 1) Create user & dirs
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  sudo useradd -m -s /bin/bash "$APP_USER"
fi
sudo mkdir -p "$DATA_DIR"
sudo chown -R "$APP_USER:$APP_USER" "$DATA_DIR"

# 2) Node & pnpm (if not installed)
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
if ! command -v pnpm >/dev/null 2>&1; then
  sudo npm -g install pnpm
fi

# 3) Build app
cd "$REPO_DIR"
sudo -u "$APP_USER" pnpm install
sudo -u "$APP_USER" pnpm --filter ./apps/api build

# 4) Seed env file if missing
if [ ! -f "$ENV_FILE" ]; then
  sudo -u "$APP_USER" cp "${REPO_DIR}/infra/systemd/prism-apex.env.example" "$ENV_FILE"
  echo ">> Edit $ENV_FILE before starting (set TRADINGVIEW_WEBHOOK_SECRET, etc.)"
fi

# 5) Install systemd unit
TMP_UNIT="$(mktemp)"
sudo -u "$APP_USER" cp "$SERVICE_SRC" "$TMP_UNIT"
sudo mv "$TMP_UNIT" /etc/systemd/system/prism-apex.service
sudo systemctl daemon-reload
sudo systemctl enable prism-apex.service

echo ">> To start: sudo systemctl start prism-apex && sudo systemctl status prism-apex"
echo ">> Health: curl -s http://127.0.0.1:8000/health | jq ."
