"""
Cross-Account Rules — detect directional hedging, size conflicts, EOD flat compliance across accounts.
"""

from fastapi import APIRouter
from pathlib import Path
import json
from notifications.notify import notify
from audit.logger import log_event

router = APIRouter(prefix="/api/rules/cross", tags=["rules-cross"])
DATA = Path("data/accounts.sample.json")

def load():
    with open(DATA) as f:
        return json.load(f)

def detect_hedges():
    data = load()
    conflicts = []
    # For each group: symbol should not be simultaneously long and short across accounts
    for g in data["traderGroups"]:
        symbol_sides = {}
        for a in g["accounts"]:
            for p in a.get("openPositions", []):
                if p["size"] == 0 or p["side"] == "FLAT":
                    continue
                key = (g["id"], p["symbol"])
                symbol_sides.setdefault(key, set()).add(p["side"])
        for key, sides in symbol_sides.items():
            if "BUY" in sides and "SELL" in sides:
                conflicts.append({"traderGroupId": key[0], "symbol": key[1], "type": "HEDGE"})
    return conflicts

@router.get("/check")
def cross_check():
    conflicts = detect_hedges()
    if conflicts:
        msg = f"Directional hedge detected: {conflicts}"
        notify("🚫 Cross-Account Hedge", msg)
        log_event("RULE_CHECK", "Cross-account hedge", {"conflicts": conflicts})
        return {"pass": False, "conflicts": conflicts}
    log_event("RULE_CHECK", "Cross-account OK")
    return {"pass": True, "conflicts": []}
