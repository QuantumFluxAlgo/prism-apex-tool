import json
import datetime
from pathlib import Path
from audit.logger import read_events
from analytics.payout_tracker import update_payout_status
from notifications.notify import notify

REPORTS_DIR = Path("reports")
REPORTS_DIR.mkdir(exist_ok=True)


def generate_daily_report(date: datetime.date | None = None, send_notification: bool = False):
    """Aggregate daily trading activity and generate report."""
    if date is None:
        date = datetime.date.today()

    events = read_events(date)
    gross_pnl = sum(e.get("pnl", 0) for e in events)
    fees = sum(e.get("fees", 0) for e in events)
    net_pnl = gross_pnl - fees

    breaches = [e for e in events if e.get("type") in ["GUARDRAIL", "PANIC"]]
    operator_actions = [
        e for e in events if e.get("type") in ["TICKET", "PANIC", "TRAINING"]
    ]

    report = {
        "date": str(date),
        "pnl": {"gross": gross_pnl, "net": net_pnl},
        "breaches": breaches,
        "operator_actions": operator_actions,
    }

    daily_path = REPORTS_DIR / f"daily_{date}.json"
    with open(daily_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    payout_status = update_payout_status(net_pnl, breaches)
    report["payout_status"] = payout_status

    if send_notification:
        subject = f"[DAILY REPORT] {date}"
        body = (
            f"Net PnL: {net_pnl}\n"
            f"Payout Eligible: {payout_status['eligible']}\n"
            f"Breaches: {len(breaches)}"
        )
        notify(subject, body)

    return report
