"""
Prism Apex Tool — Dashboard API
Serves performance, guardrail, payout, and calibration summaries.
"""

from fastapi import FastAPI
import json
from pathlib import Path

app = FastAPI()

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
