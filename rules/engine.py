"""Unified Rule Engine for PrismOne.

Provides a single API for validating trades against the active rule set.
Supports mode switching and includes hooks for operator dashboard
integration.
"""
from __future__ import annotations

import logging
from typing import Dict, List, Optional

from .evaluation import EvaluationRules
from .funded import FundedRules

logger = logging.getLogger(__name__)


class RuleEngine:
    """Dispatch trades to the appropriate rule set."""

    def __init__(self, mode: str, config: Dict) -> None:
        self.dashboard_client = None
        self.switch_mode(mode, config)

    def switch_mode(self, mode: str, config: Optional[Dict] = None) -> None:
        """Switch the active rule set."""
        mode = mode.lower()
        config = config or {}
        if mode == "evaluation":
            self.rules = EvaluationRules(**config)
        elif mode == "funded":
            self.rules = FundedRules(**config)
        elif mode == "live":
            self.rules = FundedRules(**config)
        else:
            raise ValueError(f"Unsupported mode: {mode}")
        self.mode = mode
        logger.info("Rule engine switched to %s mode", mode)

    def attach_dashboard(self, client) -> None:
        """Attach an operator dashboard client implementing ``publish``."""
        self.dashboard_client = client

    def validate_trade(self, trade: Dict) -> List[Dict]:
        """Validate a trade against the current rule set."""
        events = self.rules.record_trade(trade)
        if events:
            logger.debug("Rule engine events: %s", events)
            if self.dashboard_client:
                self._emit_dashboard(events)
        return events

    def _emit_dashboard(self, events: List[Dict]) -> None:
        """Transmit rule events to the operator dashboard."""
        try:
            payload = {"mode": self.mode, "events": events}
            self.dashboard_client.publish(payload)
        except Exception as exc:  # pragma: no cover - safety catch
            logger.error("Dashboard emission failed: %s", exc)
