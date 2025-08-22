"""
Panic Brake API — immediately disables all strategies.
"""

from fastapi import APIRouter
from .strategy_switch import switch_strategy
from notifications.notify import notify
from audit.logger import log_event

router = APIRouter(prefix="/api", tags=["panic"])

@router.post("/panic")
def panic(operator: str = "system"):
    switch_strategy("OFF", operator=operator, reason="panic")
    notify("🔴 PANIC MODE", f"Triggered by {operator}. All strategies OFF.")
    log_event("PANIC", "triggered", {"operator": operator})
    return {"status":"panic_triggered"}
