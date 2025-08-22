"""Risk Simulator Core.

Bar-level replay engine for strategies under Apex rules."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import pandas as pd

from rules.engine import RuleEngine


@dataclass
class Position:
    """Track an open position during simulation."""

    side: str
    entry_price: float
    stop_loss: float
    target: float
    size: int
    entry_time: pd.Timestamp


class Simulator:
    """Replay OHLCV bars, apply strategies and Apex rules."""

    def __init__(self, strategy, rules: RuleEngine, starting_balance: float = 0.0) -> None:
        self.strategy = strategy
        self.rules = rules
        self.balance = starting_balance
        self.open_positions: List[Position] = []
        self.trades: List[Dict] = []
        self.logs: List[Dict] = []

    def run(self, data: pd.DataFrame) -> Dict[str, List[Dict]]:
        """Replay OHLCV bars sequentially, run strategy, validate with rules."""
        df = data.reset_index(drop=True)
        for i, bar in df.iterrows():
            history = df.iloc[: i + 1]
            candidates = self.strategy.on_bar(bar, history)
            for c in candidates:
                pos = Position(
                    side=c["side"],
                    entry_price=c["entry_price"],
                    stop_loss=c["stop_loss"],
                    target=c["target"],
                    size=c.get("size", 1),
                    entry_time=bar["date"],
                )
                self.open_positions.append(pos)

            remaining: List[Position] = []
            for pos in self.open_positions:
                exit_price: Optional[float] = None
                if pos.side == "long":
                    if bar["low"] <= pos.stop_loss:
                        exit_price = pos.stop_loss
                    elif bar["high"] >= pos.target:
                        exit_price = pos.target
                else:
                    if bar["high"] >= pos.stop_loss:
                        exit_price = pos.stop_loss
                    elif bar["low"] <= pos.target:
                        exit_price = pos.target

                if exit_price is not None:
                    profit = (
                        (exit_price - pos.entry_price) * pos.size
                        if pos.side == "long"
                        else (pos.entry_price - exit_price) * pos.size
                    )
                    self.balance += profit
                    trade = {
                        "side": pos.side,
                        "entry_time": pos.entry_time,
                        "exit_time": bar["date"],
                        "entry_price": pos.entry_price,
                        "exit_price": exit_price,
                        "stop_loss": pos.stop_loss,
                        "target": pos.target,
                        "size": pos.size,
                        "profit": profit,
                        "balance": self.balance,
                    }
                    events = self.rules.validate_trade(
                        {
                            "timestamp": pd.to_datetime(bar["date"]),
                            "balance": self.balance,
                            "profit": profit,
                            "position": 0,
                        }
                    )
                    if events:
                        self.logs.extend(events)
                    self.trades.append(trade)
                else:
                    remaining.append(pos)
            self.open_positions = remaining
        return {"trades": self.trades, "logs": self.logs}
