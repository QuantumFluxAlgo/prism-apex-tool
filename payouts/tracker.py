"""
Prism Apex Tool — Payout Tracker

Monitors account performance and calculates payout eligibility per Apex rules.
"""

import json
import csv
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPORT_DIR = Path("reports/payouts/")
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def calculate_payouts(trading_days, profit_history, last_payout_date=None):
    """
    Args:
        trading_days: int — number of trading days completed
        profit_history: list of daily P/L (floats)
        last_payout_date: datetime.date or None
    Returns:
        dict with next payout date, eligible amount, and reserves
    """
    total_profit = sum(profit_history)
    eligible = False
    next_date = None

    if trading_days >= 10 and total_profit >= 1000:
        eligible = True
        base_date = last_payout_date or datetime.now(timezone.utc).date()
        next_date = base_date + timedelta(days=14)

    first_25k = min(total_profit, 25000)
    remainder = max(total_profit - 25000, 0)
    available_balance = first_25k + remainder * 0.9
    withheld_reserve = total_profit - available_balance

    return {
        "eligible": eligible,
        "trading_days": trading_days,
        "total_profit": total_profit,
        "next_payout_date": str(next_date) if next_date else None,
        "available_balance": available_balance,
        "withheld_reserve": withheld_reserve,
    }


def run_tracker():
    # Placeholder — load from real DB in production
    trading_days = 12
    profit_history = [200, -50, 300, 150, -100, 500, 250, 100, 400, 150, -75, 225]

    result = calculate_payouts(trading_days, profit_history)

    # Save JSON
    with open(REPORT_DIR / "summary.json", "w") as f:
        json.dump(result, f, indent=2)

    # Save CSV
    with open(REPORT_DIR / "summary.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=result.keys())
        writer.writeheader()
        writer.writerow(result)

    print("Payout report generated.")


if __name__ == "__main__":
    run_tracker()
