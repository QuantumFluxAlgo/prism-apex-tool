"""
Strategy Switcher API — Prism Apex Tool
"""

from fastapi import APIRouter
from pathlib import Path
import json
from datetime import datetime, time
from notifications.notify import notify
from audit.logger import log_event

router = APIRouter(prefix="/api/strategy", tags=["strategy"])
DATA = Path("data/strategy_schedule.sample.json")

def load_schedule():
    with open(DATA) as f:
        return json.load(f)

state = {"active": "OFF", "lastSwitch": None, "reason": None}

@router.get("/active")
def active_strategy():
    return state

@router.post("/switch")
def switch_strategy(strategy: str, operator: str = "system", reason: str = "manual"):
    prev = state["active"]
    state["active"] = strategy
    state["lastSwitch"] = datetime.utcnow().isoformat()
    state["reason"] = reason
    notify("\ud83d\udd04 Strategy Switch", f"{prev} → {strategy} by {operator}")
    log_event("STRATEGY_SWITCH", "manual_switch", {"from": prev, "to": strategy, "operator": operator, "reason": reason})
    return state
