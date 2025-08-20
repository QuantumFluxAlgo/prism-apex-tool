"""Simulate a schedule day by printing active strategy every 30 minutes."""

from datetime import datetime, timedelta
from api.strategy_switch import load_schedule

def simulate_day():
    sched = load_schedule()
    t = datetime.strptime("00:00", "%H:%M")
    end = datetime.strptime("23:59", "%H:%M")
    step = timedelta(minutes=30)
    while t <= end:
        time_str = t.strftime("%H:%M")
        strategy = "OFF"
        for r in sched.get("restrictions", []):
            if r["startGMT"] <= time_str <= r["endGMT"]:
                strategy = f"OFF ({r['reason']})"
                break
        if strategy == "OFF":
            for w in sched.get("windows", []):
                if w["startGMT"] <= time_str <= w["endGMT"]:
                    strategy = w["strategy"]
                    break
        print(f"{time_str}: {strategy}")
        t += step

if __name__ == "__main__":
    simulate_day()
