"""Opening Range Breakout strategy."""

from __future__ import annotations

from typing import Dict, List

import pandas as pd


class OpeningRangeStrategy:
    """Enter on break of the first bar's high or low."""

    def __init__(self, range_bars: int = 1, r_multiple: float = 2.0) -> None:
        self.range_bars = range_bars
        self.r_multiple = r_multiple
        self.open_high: float | None = None
        self.open_low: float | None = None

    def on_bar(self, bar: pd.Series, history: pd.DataFrame) -> List[Dict]:
        trades: List[Dict] = []
        if len(history) == self.range_bars:
            self.open_high = history["high"].max()
            self.open_low = history["low"].min()
            return trades
        if len(history) < self.range_bars:
            return trades

        assert self.open_high is not None and self.open_low is not None
        if bar["close"] > self.open_high:
            risk = bar["close"] - self.open_low
            trades.append(
                {
                    "side": "long",
                    "entry_price": bar["close"],
                    "stop_loss": self.open_low,
                    "target": bar["close"] + self.r_multiple * risk,
                }
            )
        elif bar["close"] < self.open_low:
            risk = self.open_high - bar["close"]
            trades.append(
                {
                    "side": "short",
                    "entry_price": bar["close"],
                    "stop_loss": self.open_high,
                    "target": bar["close"] - self.r_multiple * risk,
                }
            )
        return trades
