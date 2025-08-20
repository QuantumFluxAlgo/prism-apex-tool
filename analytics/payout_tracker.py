import json
from pathlib import Path

PAYOUT_THRESHOLD = 2500
STATUS_FILE = Path("reports/payout_status.json")


def update_payout_status(daily_pnl: float, breaches=None):
    """Update cumulative PnL and payout eligibility."""
    if breaches is None:
        breaches = []

    status = {
        "cumulative_pnl": 0.0,
        "threshold": PAYOUT_THRESHOLD,
        "eligible": False,
        "breached": False,
    }
    if STATUS_FILE.exists():
        with open(STATUS_FILE, "r", encoding="utf-8") as f:
            status.update(json.load(f))

    status["cumulative_pnl"] += daily_pnl
    if breaches:
        status["breached"] = True
    status["eligible"] = (
        status["cumulative_pnl"] >= PAYOUT_THRESHOLD and not status["breached"]
    )

    STATUS_FILE.parent.mkdir(exist_ok=True)
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(status, f, indent=2)
    return status


def get_payout_status():
    if STATUS_FILE.exists():
        with open(STATUS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "cumulative_pnl": 0.0,
        "threshold": PAYOUT_THRESHOLD,
        "eligible": False,
        "breached": False,
    }
