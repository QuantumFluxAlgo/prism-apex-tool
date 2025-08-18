import sys
from pathlib import Path

import pandas as pd

sys.path.append(str(Path(__file__).resolve().parent.parent))

from rules.engine import RuleEngine
from simulator.core import Simulator
from simulator.metrics import compute_metrics
from strategy.orb import OpeningRangeStrategy
from strategy.vwap import VWAPStrategy


def _df(rows):
    return pd.DataFrame(rows)


def test_orb_generates_trade():
    data = _df([
        {"date": "2025-01-01 09:30", "open": 100, "high": 105, "low": 95, "close": 100, "volume": 1000},
        {"date": "2025-01-01 09:35", "open": 100, "high": 110, "low": 99, "close": 106, "volume": 1500},
        {"date": "2025-01-01 09:40", "open": 106, "high": 130, "low": 105, "close": 120, "volume": 1500},
    ])
    strat = OpeningRangeStrategy()
    rules = RuleEngine("evaluation", {"profit_target": 1000, "trailing_drawdown": 500})
    sim = Simulator(strat, rules)
    result = sim.run(data)
    assert len(result["trades"]) == 1


def test_vwap_generates_trade():
    data = _df([
        {"date": "2025-01-01 09:30", "open": 100, "high": 101, "low": 99, "close": 100, "volume": 1000},
        {"date": "2025-01-01 09:35", "open": 100, "high": 105, "low": 100, "close": 104, "volume": 1500},
    ])
    strat = VWAPStrategy()
    rules = RuleEngine("evaluation", {"profit_target": 1000, "trailing_drawdown": 500})
    sim = Simulator(strat, rules)
    result = sim.run(data)
    assert len(result["trades"]) == 1


def test_stop_target_and_breach_detection():
    data = _df([
        {"date": "2025-01-01 09:30", "open": 100, "high": 101, "low": 99, "close": 100, "volume": 1000},
        {"date": "2025-01-01 09:35", "open": 100, "high": 100, "low": 95, "close": 95, "volume": 1000},
        {"date": "2025-01-01 09:40", "open": 95, "high": 96, "low": 85, "close": 86, "volume": 1000},
    ])

    class BreachStrategy:
        def on_bar(self, bar, history):
            if len(history) == 1:
                return [{"side": "long", "entry_price": 100, "stop_loss": 99, "target": 101}]
            if len(history) == 2:
                return [{"side": "long", "entry_price": 95, "stop_loss": 90, "target": 105}]
            return []

    strat = BreachStrategy()
    rules = RuleEngine("evaluation", {"profit_target": 1000, "trailing_drawdown": 1})
    sim = Simulator(strat, rules)
    result = sim.run(data)
    trade = result["trades"][1]
    assert trade["exit_price"] == 90
    assert trade["profit"] == -5
    assert result["logs"]  # trailing drawdown breach


def test_metrics_computed_correctly():
    trades = [
        {
            "entry_price": 100,
            "stop_loss": 90,
            "exit_price": 110,
            "profit": 10,
            "exit_time": "2025-01-01",
        },
        {
            "entry_price": 110,
            "stop_loss": 105,
            "exit_price": 100,
            "profit": -10,
            "exit_time": "2025-01-02",
        },
    ]
    metrics = compute_metrics(trades, [])
    assert metrics["win_rate"] == 0.5
    assert metrics["avg_r"] == -0.5
    assert metrics["max_drawdown"] == -10
    assert metrics["daily_pnl"][pd.to_datetime("2025-01-01").date()] == 10
    assert metrics["daily_pnl"][pd.to_datetime("2025-01-02").date()] == -10
