ADR: Docker compose is API-only (2025-09-09)
Context

Local Docker runs currently ship only the API container. The dashboard and database are not included to keep iterations fast and CI stable.

Decision

Keep docker-compose.yml API-only.

Add a container healthcheck and Docker-only smoke script.

Clarify docs and fix stale references (/readiness → /ready, local API port 3000).

Consequences

Local quickstart is simpler and reliable.

A follow-up ADR/PR will introduce an all-in-one compose (API + dashboard + DB) behind a separate file or profile.
