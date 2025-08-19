# Prism Apex Tool — Rollback & Incident Runbook

**Priority:** Restore safe operations quickly, protect Apex compliance, prevent irreversible loss.

---

## 1) Immediate Actions
- [ ] Announce incident in Slack `#ops-incidents` (include time, symptoms).
- [ ] **Pause** new tickets (dashboard Pause or temporary block in API).
- [ ] Verify positions in Tradovate — **flatten** if risk is elevated.

## 2) Quick Diagnostics (5–10 min)
- [ ] `GET /health` — should be OK.
- [ ] `docker compose ps` — containers running.
- [ ] `docker compose logs --since=10m` — check errors.
- [ ] `/jobs/status` — lastOk timestamps present.

## 3) Rollback (Tag N → N-1)
- [ ] Select previous tag (e.g., `v0.1.2` → `v0.1.1`).
- [ ] Run:
```bash
TAG=v0.1.1 make deploy
```
- [ ] Confirm health:
```bash
curl -fsS http://<server>:8080/health
```
- [ ] Open dashboard `/`

## 4) Data Safety
- Volumes preserved; no destructive migrations in MVP.
- Backup `.env` and `.data/state.json` before manual edits.

## 5) Recovery & Resume
- Clear dashboard **Pause** flag when safe.
- Announce resolution in Slack with incident summary.
- Create follow-up ticket for root cause & action items.

## 6) Post-Mortem Template
- What happened:
- Impact window:
- Root cause:
- Actions taken:
- Preventative measures:
- Owners & due dates:
