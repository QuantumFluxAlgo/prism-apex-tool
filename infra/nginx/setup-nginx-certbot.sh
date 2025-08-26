#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN, e.g. DOMAIN=prism.example.com}"
EMAIL="${EMAIL:?Set EMAIL for Let’s Encrypt registration}"
SITE_AVAIL="/etc/nginx/sites-available/prism-apex.conf"
SITE_ENABLED="/etc/nginx/sites-enabled/prism-apex.conf"

# 1) Install Nginx & Certbot (Debian/Ubuntu)
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y nginx
fi
if ! command -v certbot >/dev/null 2>&1; then
  sudo apt-get install -y certbot python3-certbot-nginx
fi

# 2) Place HTTP-only bootstrap config and create webroot
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot

TMP_CONF="$(mktemp)"
sed "s/YOUR_DOMAIN/${DOMAIN}/g" infra/nginx/prism-apex.conf.example > "$TMP_CONF"
sudo cp "$TMP_CONF" "$SITE_AVAIL"
sudo ln -sf "$SITE_AVAIL" "$SITE_ENABLED"

# 3) Open firewall (UFW) if present
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow 'Nginx Full' || true
fi

# 4) Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# 5) Obtain/renew cert (nginx plugin will rewrite the server block for TLS)
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

# 6) Final test and reload
sudo nginx -t
sudo systemctl reload nginx

echo ">> HTTPS ready at https://${DOMAIN}/health"
