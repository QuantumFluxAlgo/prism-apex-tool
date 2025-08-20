"""Risk Guardrails for Apex Compliance

Checks whether strategy results adhere to Apex Trader Funding rules.
"""

from notifications.notify import notify


def check_apex_rules(perf: dict) -> dict:
    breaches = []
    if perf.get("max_daily_loss", 0) > perf.get("daily_loss_cap", 1000):
        breaches.append("daily_loss")
    if perf.get("max_dd", 0) > perf.get("trailing_dd", 2500):
        breaches.append("trailing_drawdown")
    if perf.get("open_positions_at_eod", False):
        breaches.append("eod_flat")
    if perf.get("consistency_pct", 0) > 30:
        breaches.append("consistency")

    if breaches:
        notify("🚨 Guardrail Breach", f"Breaches detected: {', '.join(breaches)}")

    return {
        "rule_breaches": breaches,
        "breach_count": len(breaches),
        "pass": len(breaches) == 0,
    }
