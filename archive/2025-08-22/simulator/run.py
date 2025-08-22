"""CLI entry point for the Prism Apex risk simulator."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from rules.engine import RuleEngine
from simulator.core import Simulator
from simulator.metrics import compute_metrics
from strategy.orb import OpeningRangeStrategy
from strategy.vwap import VWAPStrategy

STRATEGIES = {"ORB": OpeningRangeStrategy, "VWAP": VWAPStrategy}


def main() -> None:
    """Parse CLI arguments and execute a backtest."""
    parser = argparse.ArgumentParser(description="Prism Apex Risk Simulator")
    parser.add_argument("--strategy", required=True, choices=STRATEGIES.keys())
    parser.add_argument("--data", required=True, help="CSV file with OHLCV data")
    parser.add_argument("--mode", required=True, choices=["evaluation", "funded"])
    parser.add_argument(
        "--output", default="results", help="Base path for output CSV/JSON"
    )
    args = parser.parse_args()

    df = pd.read_csv(args.data, parse_dates=["date"])
    strategy = STRATEGIES[args.strategy]()
    rules = RuleEngine(
        mode=args.mode,
        config={"profit_target": 1000.0, "trailing_drawdown": 500.0},
    )
    sim = Simulator(strategy, rules)
    result = sim.run(df)

    metrics = compute_metrics(result["trades"], result["logs"])
    base = Path(args.output)
    pd.DataFrame(result["trades"]).to_csv(base.with_suffix(".csv"), index=False)
    with open(base.with_suffix(".json"), "w", encoding="utf-8") as fh:
        json.dump({"metrics": metrics, "logs": result["logs"]}, fh, indent=2, default=str)
    print(json.dumps(metrics, indent=2, default=str))


if __name__ == "__main__":  # pragma: no cover - CLI entry
    main()
