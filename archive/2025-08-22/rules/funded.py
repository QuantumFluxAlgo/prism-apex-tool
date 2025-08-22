"""Funded Phase Rules for Apex Trader Funding.

This module enforces rules for funded accounts, covering consistency,
mandatory stop-loss usage, scaling limits, payout eligibility, and
forbidden strategies. All checks produce audit-ready events.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class FundedRules:
    """Rule set for funded accounts."""

    def __init__(
        self,
        trailing_drawdown: float,
        consistency_threshold: float = 0.30,
        profit_split: float = 0.9,
        scaling_limit: int = 1,
        forbidden_strategies: Optional[List[str]] = None,
    ) -> None:
        self.trailing_drawdown = trailing_drawdown
        self.consistency_threshold = consistency_threshold
        self.profit_split = profit_split
        self.scaling_limit = scaling_limit
        self.forbidden_strategies = forbidden_strategies or []

        self.daily_profits: Dict[datetime.date, float] = {}
        self.start_balance: Optional[float] = None
        self.high_watermark: Optional[float] = None
        self.events: List[Dict] = []

    def record_trade(self, trade: Dict) -> List[Dict]:
        """Record a trade and evaluate rule compliance."""
        timestamp: datetime = trade["timestamp"]
        balance: float = trade["balance"]
        profit: float = trade.get("profit", 0.0)
        contracts: int = trade.get("contracts", 0)
        strategy: str = trade.get("strategy", "")
        stop_loss: bool = trade.get("stop_loss", False)

        if self.start_balance is None:
            self.start_balance = balance
            self.high_watermark = balance

        day = timestamp.date()
        self.daily_profits[day] = self.daily_profits.get(day, 0.0) + profit
        if self.high_watermark is not None:
            self.high_watermark = max(self.high_watermark, balance)

        events: List[Dict] = []

        if self.high_watermark is not None and balance < self.high_watermark - self.trailing_drawdown:
            events.append(self._event("trailing_drawdown", "trailing drawdown breached"))

        if not stop_loss:
            events.append(self._event("stop_loss", "trade submitted without stop loss"))

        if contracts > self.scaling_limit:
            events.append(
                self._event(
                    "scaling",
                    f"{contracts} contracts exceeds limit {self.scaling_limit}",
                )
            )

        if strategy in self.forbidden_strategies:
            events.append(
                self._event(
                    "forbidden_strategy", f"use of forbidden strategy '{strategy}'",
                )
            )

        if events:
            logger.info("Funded rule events: %s", events)
            self.events.extend(events)

        return events

    def _event(self, rule: str, message: str) -> Dict:
        """Create a structured event for downstream consumers."""
        return {"timestamp": datetime.utcnow(), "rule": rule, "message": message}

    def check_consistency(self) -> bool:
        """Validate the 30% consistency rule across daily profits."""
        total_profit = sum(p for p in self.daily_profits.values() if p > 0)
        if total_profit <= 0:
            return True
        return all(
            profit / total_profit <= self.consistency_threshold
            for profit in self.daily_profits.values()
            if profit > 0
        )

    def payout_eligibility(self, min_days: int, min_profitable_days: int, cap: float) -> Dict:
        """Assess payout eligibility and calculate capped amount."""
        days = len(self.daily_profits)
        profitable_days = len([p for p in self.daily_profits.values() if p > 0])
        total_profit = sum(self.daily_profits.values())
        eligible = days >= min_days and profitable_days >= min_profitable_days and total_profit > 0
        payout = min(total_profit * self.profit_split, cap) if eligible else 0.0
        return {"eligible": eligible, "payout": payout}

    def audit_log(self) -> List[Dict]:
        """Return all recorded events for audit purposes."""
        return list(self.events)
