"""End-to-End Dry-Run Simulator for Prism Apex Tool."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

import pandas as pd

sys.path.append(str(Path(__file__).resolve().parents[1]))

from audit.logger import log_event
from notifications.notify import notify
from rules.engine import RuleEngine
from simulator.core import Simulator
from simulator.metrics import compute_metrics
from strategy.orb import OpeningRangeStrategy
from strategy.vwap import VWAPStrategy

STRATEGY_MAP: dict[str, type] = {
    "ORB": OpeningRangeStrategy,
    "VWAP": VWAPStrategy,
}


def _load_data(path: str | Path, start: str, end: str) -> pd.DataFrame:
    """Load bar data and slice by date range."""
    df = pd.read_csv(path, parse_dates=[0])
    ts_col = df.columns[0]
    df = df.rename(columns={ts_col: "timestamp"})
    start_ts = pd.to_datetime(start, utc=True)
    end_ts = pd.to_datetime(end, utc=True)
    df = df[(df["timestamp"] >= start_ts) & (df["timestamp"] <= end_ts)]
    return df.rename(columns={"timestamp": "date"})


def simulate(input_file: str, strategy: str, start: str, end: str, outdir: str = "reports/simulation") -> Tuple[List[dict], List[dict]]:
    """Run the dry-run simulation and emit reports."""
    df = _load_data(input_file, start, end)

    selected = STRATEGY_MAP.keys() if strategy == "ALL" else [strategy]
    tickets: List[dict] = []
    events: List[dict] = []

    for strat_name in selected:
        strat_cls = STRATEGY_MAP[strat_name]
        strat = strat_cls()
        rules = RuleEngine(mode="evaluation", config={"profit_target": 1_000.0, "trailing_drawdown": 1_000.0})
        sim = Simulator(strat, rules)
        result = sim.run(df)
        tickets.extend(result["trades"])
        events.extend(result["logs"])

    # Emit notifications and audit logs for events
    for ev in events:
        subject = "⚠️ Guardrail Breach" if ev.get("rule") != "profit_target" else "ℹ️ Rule Event"
        notify(subject, ev.get("message", ""))
        log_event("GUARDRAIL_EVENT", ev.get("rule", ""), ev)

    metrics = compute_metrics(tickets, events)
    total_pnl = float(sum(t.get("profit", 0.0) for t in tickets))
    eod_breach = any(ev.get("rule") == "eod_flat" for ev in events)

    session_id = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_path = Path(outdir)
    out_path.mkdir(parents=True, exist_ok=True)

    json_path = out_path / f"session_{session_id}.json"
    with json_path.open("w", encoding="utf-8") as f:
        json.dump({"tickets": tickets, "events": events, "metrics": {"total_pnl": total_pnl, **metrics}}, f, indent=2, default=str)

    md_path = out_path / f"session_{session_id}.md"
    with md_path.open("w", encoding="utf-8") as f:
        f.write(f"# Simulation {session_id}\n\n")
        f.write(f"Strategy: {strategy}\n")
        f.write(f"Period: {start} → {end}\n\n")
        f.write(f"Total PnL: {total_pnl:.2f}\n")
        f.write(f"Max Drawdown: {metrics['max_drawdown']:.2f}\n")
        f.write(f"Rule Breaches: {metrics['rule_breaches']}\n")
        f.write(f"EOD Flat: {'No breaches' if not eod_breach else 'Positions open past EOD'}\n\n")
        f.write("## Guardrail Events\n")
        for ev in events:
            f.write(f"- {ev.get('message', '')}\n")

    return tickets, events


def main() -> None:
    parser = argparse.ArgumentParser(description="Run dry-run simulation")
    parser.add_argument("--strategy", default="ALL", choices=["ORB", "VWAP", "ALL"])
    parser.add_argument("--start", default="2025-01-01")
    parser.add_argument("--end", default="2025-01-31")
    parser.add_argument("--input", required=True, help="Path to bar-level CSV")
    args = parser.parse_args()
    simulate(args.input, args.strategy, args.start, args.end)


if __name__ == "__main__":  # pragma: no cover - CLI entry
    main()
