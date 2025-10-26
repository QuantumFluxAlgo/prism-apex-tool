# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- DB: add `tickets.source` (and `ticket_events.source`) for CSV export compatibility.

## [1.0.2] - 2025-10-26
### Changed
- `make up`/`make prod-up` now block on Postgres, run ingest/gapfill/tickets seeds automatically, and document the behavior for both local and server deploys.
- Added reusable `wait-db-local` and `wait-db-prod` helpers so job runs no longer race the database startup.
- Status endpoint now probes `ingress-yahoo` (or `INGRESS_HEALTH_URL`) so dashboard Yahoo health lights reflect the real container.

## [1.0.0] - 2025-10-25
### Added
- Initial stable release candidate with version pinning and release documentation.
