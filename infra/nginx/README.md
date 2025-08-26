# Prism Apex — Nginx + Let’s Encrypt TLS

## Prereqs
- DNS A/AAAA records for **YOUR_DOMAIN** pointing to this VM’s public IP
- Prism Apex API running via systemd on `127.0.0.1:8000`
- Ubuntu 22.04+ (or Debian-based)

## One-time setup
```bash
# From repo root, as sudo-capable user
export DOMAIN=YOUR_DOMAIN
export EMAIL=you@example.com
bash infra/nginx/setup-nginx-certbot.sh
```

### What this does

- Installs Nginx + Certbot
- Places site config at /etc/nginx/sites-available/prism-apex.conf
- Obtains a Let’s Encrypt cert for $DOMAIN
- Forces HTTPS + HTTP/2
- Proxies to http://127.0.0.1:8000
- Adds rate limiting and security headers

### Verify
```bash
curl -I https://$DOMAIN/health
# Should return HTTP/2 200
```

### Logs

- /var/log/nginx/prism-apex.access.log
- /var/log/nginx/prism-apex.error.log

### Renewals

Certbot installs a systemd timer. To test:

```bash
sudo certbot renew --dry-run
```

### TradingView

Point your webhook to: https://$DOMAIN/webhooks/tradingview

Add header: x-webhook-secret: <your secret>
