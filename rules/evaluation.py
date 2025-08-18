"""Evaluation Phase Rules for Apex Trader Funding.

This module enforces the evaluation-phase constraints used by PrismOne.
Rules include profit targets, trailing drawdown, minimum trading days,
end-of-day flat requirements, and allowed trading times.

All violations emit structured events suitable for audit logging and
operator dashboards.
"""
from __future__ import annotations

import logging
from datetime import datetime, time
from typing import Dict, List, Optional, Set

logger = logging.getLogger(__name__)


class EvaluationRules:
    """Rule set for evaluation accounts.

    Parameters
    ----------
    profit_target:
        Required profit in account currency before evaluation passes.
    trailing_drawdown:
        Maximum distance from high-water mark allowed before failure.
    min_days:
        Minimum number of trading days required.
    allowed_start / allowed_end:
        Inclusive trading window as UTC time objects.
    """

    def __init__(
        self,
        profit_target: float,
        trailing_drawdown: float,
        min_days: int = 7,
        allowed_start: time = time(0, 0),
        allowed_end: time = time(23, 59),
    ) -> None:
        self.profit_target = profit_target
        self.trailing_drawdown = trailing_drawdown
        self.min_days = min_days
        self.allowed_start = allowed_start
        self.allowed_end = allowed_end

        self.start_balance: Optional[float] = None
        self.high_watermark: Optional[float] = None
        self.trading_days: Set[datetime.date] = set()
        self.events: List[Dict] = []

    def record_trade(self, trade: Dict) -> List[Dict]:
        """Process a trade and evaluate rule compliance.

        Parameters
        ----------
        trade:
            Dictionary containing at least ``timestamp`` (datetime),
            ``balance`` (float), ``profit`` (float) and ``position`` (int).

        Returns
        -------
        list of dict
            Structured events for any rule violations or milestones.
        """
        timestamp: datetime = trade["timestamp"]
        balance: float = trade["balance"]
        profit: float = trade.get("profit", 0.0)
        position: int = trade.get("position", 0)

        if self.start_balance is None:
            self.start_balance = balance
            self.high_watermark = balance

        self.trading_days.add(timestamp.date())
        if self.high_watermark is not None:
            self.high_watermark = max(self.high_watermark, balance)

        events: List[Dict] = []

        if not self.allowed_start <= timestamp.time() <= self.allowed_end:
            events.append(self._event("time_window", "trade outside allowed session"))

        if self.high_watermark is not None and balance < self.high_watermark - self.trailing_drawdown:
            events.append(self._event("trailing_drawdown", "trailing drawdown breached"))

        if (
            profit
            and self.start_balance is not None
            and balance >= self.start_balance + self.profit_target
        ):
            events.append(self._event("profit_target", "profit target achieved"))

        if timestamp.time() >= self.allowed_end and position != 0:
            events.append(self._event("eod_flat", "position open past end of day"))

        if events:
            logger.info("Evaluation rule events: %s", events)
            self.events.extend(events)

        return events

    def _event(self, rule: str, message: str) -> Dict:
        """Create a structured event for downstream consumers."""
        return {"timestamp": datetime.utcnow(), "rule": rule, "message": message}

    def days_traded(self) -> int:
        """Return the count of unique trading days."""
        return len(self.trading_days)

    def check_minimum_days(self) -> bool:
        """Determine if minimum day requirement is met."""
        return self.days_traded() >= self.min_days

    def violations(self) -> List[Dict]:
        """Return all recorded rule violations."""
        return [e for e in self.events if e["rule"] != "profit_target"]
