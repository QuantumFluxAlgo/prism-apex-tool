# Ports & Environment Notes

The local stack exposes two primary ports by default:

- **8080** – Prism Apex API (compose service `api`).
- **5178** – Dashboard Lite / operator UI.

They are currently documented directly inside `README-dev.md` and compose files. To reduce drift and make overrides easier, prefer exporting the ports via environment variables, for example:

```env
API_PORT=8080
DASH_PORT=5178
```

You can then reference these variables inside compose overrides or `.env` files. This change does not modify any Docker compose files yet—it simply notes the convention so future updates can centralise port management.

Remember: runtime remains **tickets-only**. These ports expose telemetry and operator dashboards; no automated order placement endpoints exist.
