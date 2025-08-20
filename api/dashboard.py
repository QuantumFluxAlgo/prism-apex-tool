"""
Prism Apex Tool — Dashboard API
Serves performance, guardrail, payout, and calibration summaries.
"""

from fastapi import FastAPI
import json
from pathlib import Path
from api.accounts import router as accounts_router
from api.rules_cross import router as rules_cross_router
from api.copytrader import router as copy_router
from api.jobs_multi import start_multi_job
from api.strategy_switch import router as strategy_router
from api.jobs_scheduler import start_scheduler_job

app = FastAPI()
app.include_router(accounts_router)
app.include_router(rules_cross_router)
app.include_router(copy_router)
app.include_router(strategy_router)
start_multi_job(app, every_sec=30)
start_scheduler_job(every_sec=30)

REPORTS = Path("reports/")


def load_json(path):
    with open(path) as f:
        return json.load(f)


@app.get("/api/performance")
def performance():
    return load_json(REPORTS / "performance/summary.json")


@app.get("/api/guardrails")
def guardrails():
    return load_json(REPORTS / "guardrails/summary.json")


@app.get("/api/payouts")
def payouts():
    return load_json(REPORTS / "payouts/summary.json")


@app.get("/api/calibration")
def calibration():
    return load_json(REPORTS / "calibration/summary.json")
