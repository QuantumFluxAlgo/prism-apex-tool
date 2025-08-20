# Release Checklist — Prism Apex Tool

## Preflight
- [ ] All unit tests pass (`make test`)
- [ ] All guardrail monitors pass (`make guardrails:test`)
- [ ] Simulator run successful (`make simulate`)

## Operator Signoff
- [ ] Operator confirms panic button works
- [ ] Operator confirms notifications (Slack/Email) received
- [ ] Operator confirms training mode works

## PM Signoff
- [ ] PM validates checklist complete
- [ ] Version bump confirmed

## Release
- [ ] Run `make release VERSION=vX.Y.Z`
- [ ] GitHub Actions pipeline must pass
- [ ] Tag pushed and CI confirms release
