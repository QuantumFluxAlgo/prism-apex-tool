# Local Development (Canonical)

Single entrypoint: http://localhost:5180

Run:
  bash tools/codex/stabilize_5180.sh all

Rules:
- Do not expose api/dashboard host ports in local mode.
- Dashboard talks same-origin via /api.
- If you hit port issues, rerun the stabilizer (it backs up DB first).
