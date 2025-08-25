# Prism Apex — Ubuntu VM (systemd) Runbook

## Prereqs
- Ubuntu 22.04+ VM (you chose VM deployment)
- Open outbound internet for npm install; inbound TCP :8000 (or reverse proxy)
- Node LTS and pnpm (installer script handles it)

## One‑time setup (as a sudo‑capable user)
```bash
# 1) Clone the repo into prism user's home (or adjust REPO_DIR for your layout)
sudo useradd -m -s /bin/bash prism || true
sudo -u prism -H bash -lc 'cd ~ && git clone https://github.com/QuantumFluxAlgo/prism-apex-tool.git || true'
# If already cloned, pull latest Test branch
sudo -u prism -H bash -lc 'cd ~/prism-apex-tool && git fetch && git checkout Test && git pull'

# 2) Run the installer
cd ~/prism-apex-tool
sudo APP_USER=prism REPO_DIR=/home/prism/prism-apex-tool bash infra/systemd/install-prism-apex.sh

# 3) Edit env and set secrets
sudo -u prism nano /home/prism/prism-apex.env
# Set TRADINGVIEW_WEBHOOK_SECRET and (optionally) BEARER_TOKEN

# 4) Start service
sudo systemctl start prism-apex
sudo systemctl status prism-apex --no-pager

# 5) Verify health
curl -s http://127.0.0.1:8000/health | jq .
```

Logs & lifecycle
```
journalctl -u prism-apex -f
sudo systemctl restart prism-apex
sudo systemctl stop prism-apex
```

Data directory

Default: /home/prism/prism-apex-data (tickets, accounts, exports)

Ensure backups if needed.

Reverse proxy (optional, HTTP only here)

See [../nginx/README.md](../nginx/README.md) for Nginx + Let's Encrypt TLS termination.

Leave service on HOST=0.0.0.0 PORT=8000

Terminate TLS in Nginx/Traefik and forward to 127.0.0.1:8000

If proxy adds X-Forwarded-*, set TRUST_PROXY=true in /home/prism/prism-apex.env

Firewall quickstart (optional)
```
sudo ufw allow 22/tcp
sudo ufw allow 8000/tcp   # or only allow from proxy host
sudo ufw enable
```

Health endpoints

GET /health → {"ok":true} when service is up

GET /ready → readiness check

GET /version → version metadata (if enabled)

Updates / redeploy
```
sudo -u prism -H bash -lc 'cd ~/prism-apex-tool && git fetch && git checkout Test && git pull'
sudo -u prism -H bash -lc 'pnpm install && pnpm --filter ./apps/api build'
sudo systemctl restart prism-apex
```

---
