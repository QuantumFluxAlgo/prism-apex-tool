"""
Prism Apex Tool — Multi-Account API (listing & summaries)
"""

from fastapi import APIRouter
from pathlib import Path
import json

router = APIRouter(prefix="/api/accounts", tags=["accounts"])
DATA = Path("data/accounts.sample.json")

def load_accounts():
    with open(DATA) as f:
        return json.load(f)

@router.get("")
def list_accounts():
    data = load_accounts()
    flat = []
    for g in data["traderGroups"]:
        for a in g["accounts"]:
            flat.append({**a, "traderGroupId": g["id"], "traderGroup": g["name"]})
    return {"accounts": flat}

@router.get("/groups")
def list_groups():
    data = load_accounts()
    return {"traderGroups": data["traderGroups"]}

@router.get("/positions")
def positions_summary():
    data = load_accounts()
    out = []
    for g in data["traderGroups"]:
        for a in g["accounts"]:
            for p in a.get("openPositions", []):
                out.append({
                    "traderGroupId": g["id"],
                    "accountId": a["id"],
                    "mode": a["mode"],
                    "symbol": p["symbol"],
                    "side": p["side"],
                    "size": p["size"],
                    "avgPx": p["avgPx"]
                })
    return {"positions": out}
