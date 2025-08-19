# Prism Apex Tool — Executive Go-Live Sign-Off

**Project:** Prism Apex Tool (Path 1b — Prop-Firm Equities/Futures Trading)  
**Go-Live Date:** Oct 1 (GMT)

---

## Summary
- MVP Scope: Manual execution via Tradovate; strategies ORB + VWAP.
- Risk Controls: Apex guardrails enforced (EOD flat, daily loss proximity, consistency, stop-loss, ≤5R).
- Monitoring: Email/Telegram/Slack alerts + background jobs.
- Deployment: Docker on single Ubuntu host; health-gated.

---

## Readiness Checklist Status
- Go-Live Master Checklist: **All items ✅**  
- UAT Scenarios: **All PASS** (see `docs/release/uat-scenarios.md`)

---

## Residual Risks (Known & Accepted)
- Manual order entry risk (operator error) — mitigated by ticket UI + OCO + alerts.
- Bar-level backtest approximation — conservative execution assumptions.
- Single-host deployment — acceptable for MVP; DR plan documented.

---

## Approval
**CTO (Sean):**  
Name: _______________________  Signature: _______________________  Date: __________

**CEO (Craig):**  
Name: _______________________  Signature: _______________________  Date: __________

**Solutions Architect:**  
Name: _______________________  Signature: _______________________  Date: __________

**IT PM:**  
Name: _______________________  Signature: _______________________  Date: __________
