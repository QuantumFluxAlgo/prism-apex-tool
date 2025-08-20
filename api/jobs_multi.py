"""
Background job to run cross-account checks on interval (e.g., every 30s during session).
"""

import threading, time
from fastapi import FastAPI
from .rules_cross import detect_hedges
from notifications.notify import notify
from audit.logger import log_event

def start_multi_job(app: FastAPI, every_sec: int = 30):
    def loop():
        while True:
            try:
                conflicts = detect_hedges()
                if conflicts:
                    notify("🚫 Cross-Account Hedge", f"{conflicts}")
                    log_event("RULE_CHECK", "Cross-account hedge", {"conflicts": conflicts})
            except Exception as e:
                log_event("SYSTEM_EVENT", "multi_job_error", {"err": str(e)})
            time.sleep(every_sec)
    t = threading.Thread(target=loop, daemon=True)
    t.start()
