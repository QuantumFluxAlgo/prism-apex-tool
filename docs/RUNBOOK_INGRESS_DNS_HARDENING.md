# Runbook: Ingress DNS hardening (prevent SPA 502 after dashboard rebuild)

_Last updated: 2026-01-04_

## 1) Symptom
- `/api/*` routes return 200 OK
- SPA routes like `/` or `/tickets` return **502 Bad Gateway**
- Nginx error logs show upstream connectivity errors to a stale container IP

## 2) Root cause (Docker DNS + long-lived Nginx upstream caching)
When the dashboard container is recreated, its IP changes.
If nginx is pinned to a stale upstream IP (or fails to re-resolve), SPA proxying breaks.

## 3) Fix implemented
We hardened ingress to re-resolve dashboard via Docker DNS:

- `resolver 127.0.0.11 valid=10s ipv6=off;`
- route SPA proxy_pass via a variable upstream (forces DNS re-resolution)

File:
- `deploy/ingress/local/default.conf`

## 4) Operator verification (smoke)
Expected: all 200.

- `curl -i http://127.0.0.1:5180/ | head`
- `curl -i http://127.0.0.1:5180/tickets | head`
- `curl -i http://127.0.0.1:5180/api/status | head`

Resiliency test:
- recreate dashboard container
- immediately re-run the curls above

## 5) If it ever regresses
Fast mitigation:
- restart ingress container (forces fresh DNS resolution)

Example:
- `docker restart prismapex-ingress`

