"""
Background scheduler to auto-switch strategies based on windows and restrictions.
"""

import threading, time as pytime
from datetime import datetime
from .strategy_switch import switch_strategy, load_schedule
from audit.logger import log_event

def in_window(now, start, end):
    return start <= now <= end

def start_scheduler_job(every_sec: int = 30):
    def loop():
        while True:
            try:
                sched = load_schedule()
                now = datetime.utcnow().strftime("%H:%M")
                active = None
                # Check restrictions first
                for r in sched.get("restrictions", []):
                    if r["startGMT"] <= now <= r["endGMT"]:
                        if switch_strategy("OFF", operator="scheduler", reason=r["reason"]):
                            log_event("STRATEGY_SWITCH", "restriction", {"reason": r["reason"]})
                        active = "OFF"
                        break
                if not active:
                    for w in sched.get("windows", []):
                        if w["startGMT"] <= now <= w["endGMT"]:
                            if switch_strategy(w["strategy"], operator="scheduler", reason="window"):
                                log_event("STRATEGY_SWITCH", "window", {"strategy": w["strategy"]})
                            active = w["strategy"]
                            break
                if not active:
                    switch_strategy("OFF", operator="scheduler", reason="no_window")
            except Exception as e:
                log_event("SYSTEM_EVENT", "scheduler_error", {"err": str(e)})
            pytime.sleep(every_sec)
    t = threading.Thread(target=loop, daemon=True)
    t.start()
