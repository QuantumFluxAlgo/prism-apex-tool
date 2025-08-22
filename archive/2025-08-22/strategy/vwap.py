"""VWAP cross strategy."""

from __future__ import annotations

from typing import Dict, List

import pandas as pd


class VWAPStrategy:
    """Enter when price crosses VWAP."""

    def __init__(self, r_multiple: float = 2.0) -> None:
        self.r_multiple = r_multiple

    def on_bar(self, bar: pd.Series, history: pd.DataFrame) -> List[Dict]:
        trades: List[Dict] = []
        if len(history) < 2:
            return trades
        tp = (history["high"] + history["low"] + history["close"]) / 3
        vwap_series = (tp * history["volume"]).cumsum() / history["volume"].cumsum()
        current_vwap = vwap_series.iloc[-1]
        prev_close = history["close"].iloc[-2]
        prev_vwap = vwap_series.iloc[-2]

        if prev_close <= prev_vwap and bar["close"] > current_vwap:
            risk = bar["close"] - bar["low"]
            trades.append(
                {
                    "side": "long",
                    "entry_price": bar["close"],
                    "stop_loss": bar["low"],
                    "target": bar["close"] + self.r_multiple * risk,
                }
            )
        elif prev_close >= prev_vwap and bar["close"] < current_vwap:
            risk = bar["high"] - bar["close"]
            trades.append(
                {
                    "side": "short",
                    "entry_price": bar["close"],
                    "stop_loss": bar["high"],
                    "target": bar["close"] - self.r_multiple * risk,
                }
            )
        return trades
