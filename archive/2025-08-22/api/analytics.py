from fastapi import APIRouter
from analytics.post_trade import generate_daily_report
from analytics.payout_tracker import get_payout_status

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/daily")
def daily():
    return generate_daily_report()


@router.get("/payout")
def payout():
    return get_payout_status()
