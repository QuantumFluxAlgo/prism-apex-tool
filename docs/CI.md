# CI Guardrails

- **Hard rule (fails CI):** no code may include broker order APIs:
  `placeOrder`, `startOrderStrategy`, `liquidatePosition`.
  This project is *tickets-only*; operators place OCOs manually.

- **Soft checks (non-blocking for now):**
  - `pnpm -r lint`
  - `pnpm -r typecheck`
  - `pnpm -r test`

Artifacts are uploaded on failure to help debugging.
