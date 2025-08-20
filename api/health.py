from fastapi import APIRouter
import psutil, datetime
from .strategy_switch import state

router = APIRouter(prefix="/api", tags=["health"])

@router.get("/health")
def health():
    return {
        "status": "OK",
        "time": datetime.datetime.utcnow().isoformat(),
        "active_strategy": state.get("active","OFF"),
        "cpu": psutil.cpu_percent(),
        "mem": psutil.virtual_memory().percent
    }
