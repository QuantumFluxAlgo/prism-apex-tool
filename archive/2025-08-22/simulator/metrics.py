"""Risk Simulator Metrics.

Compute profitability and risk statistics along with Apex rule adherence."""

from __future__ import annotations

from typing import Dict, List

import pandas as pd


def compute_metrics(trades: List[Dict], logs: List[Dict]) -> Dict:
    """Compute win rate, average R multiple, drawdown and daily PnL."""
    df = pd.DataFrame(trades)
    if df.empty:
        return {
            "win_rate": 0.0,
            "avg_r": 0.0,
            "max_drawdown": 0.0,
            "daily_pnl": {},
            "rule_breaches": len(logs),
        }

    df["risk"] = (df["entry_price"] - df["stop_loss"]).abs()
    df["r_multiple"] = df["profit"] / df["risk"]

    win_rate = float((df["profit"] > 0).mean())
    avg_r = float(df["r_multiple"].mean())

    pnl_cum = df["profit"].cumsum()
    drawdown = pnl_cum - pnl_cum.cummax()
    max_drawdown = float(drawdown.min())

    daily_pnl = (
        df.groupby(pd.to_datetime(df["exit_time"]).dt.date)["profit"].sum().to_dict()
    )

    return {
        "win_rate": win_rate,
        "avg_r": avg_r,
        "max_drawdown": max_drawdown,
        "daily_pnl": daily_pnl,
        "rule_breaches": len(logs),
    }
