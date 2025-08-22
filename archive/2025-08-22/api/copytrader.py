"""
Copy-Trader — preview and commit tickets across multiple accounts (same direction only, scaled by rules).
MVP outputs tickets for manual entry; no auto-placement.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from pathlib import Path
import json
from notifications.notify import notify
from audit.logger import log_event

router = APIRouter(prefix="/api/copytrader", tags=["copytrader"])
DATA = Path("data/accounts.sample.json")

class CopyRequest(BaseModel):
    traderGroupId: str
    baseAccountId: str
    symbol: str
    side: str  # BUY/SELL
    entry: float
    stop: float
    target: float
    baseSize: int = Field(gt=0)
    mode: str  # evaluation|funded

def load():
    with open(DATA) as f:
        return json.load(f)

def scale_size(account, baseSize: int):
    # Simple proportional scaler respecting maxContracts and half-size if funded & no buffer
    size = baseSize
    size = min(size, account["maxContracts"])
    if account.get("mode") == "funded" and not account.get("bufferAchieved", False):
        size = max(1, size // 2)
    return size

@router.post("/preview")
def preview(req: CopyRequest):
    data = load()
    # Find group & accounts
    group = next((g for g in data["traderGroups"] if g["id"] == req.traderGroupId), None)
    if not group:
        return {"ok": False, "reason": "group_not_found"}

    # Prevent hedging: ensure no account is currently in opposite side for symbol
    opposite = "SELL" if req.side == "BUY" else "BUY"
    for a in group["accounts"]:
        for p in a.get("openPositions", []):
            if p["symbol"] == req.symbol and p["side"] == opposite and p["size"] > 0:
                return {"ok": False, "reason": "would_create_hedge", "accountId": a["id"]}

    # Build tickets per account
    tickets = []
    for a in group["accounts"]:
        size = scale_size(a, req.baseSize)
        if size <= 0:
            continue
        tickets.append({
            "accountId": a["id"],
            "symbol": req.symbol,
            "side": req.side,
            "entry": req.entry,
            "stop": req.stop,
            "target": req.target,
            "size": size,
            "mode": a["mode"]
        })

    return {"ok": True, "tickets": tickets}

@router.post("/commit")
def commit(req: CopyRequest):
    prev = preview(req)
    if not prev.get("ok"):
        return prev
    tickets = prev["tickets"]
    notify("🧩 Copy-Trade Tickets Ready", f"{len(tickets)} tickets for {req.symbol} {req.side}")
    log_event("OPERATOR_ACTION", "Copy-trade tickets generated", {"tickets": tickets})
    return {"ok": True, "tickets": tickets}
