# Operator Release Signoff — Plain English

## Why This Matters
We need to be sure Prism Apex Tool is safe to run under Apex rules.

## What You Do
1. Run `make simulate` → confirms rules are respected.
2. Run `make guardrails:test` → ensures brakes work.
3. Test panic button in dashboard → system must stop.
4. Confirm Slack/Email alerts arrive.
5. Confirm training mode works (`make training`).

If all checks pass:
- Tell PM "OK to release."
- PM will tag the release.

If any checks fail:
- Stop and report back.
