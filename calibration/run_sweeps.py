"""
Prism Apex Tool — Risk Parameter Calibration Sweeps

Runs bar-level backtests of ORB/VWAP strategies across parameter ranges,
checks Apex guardrails, and exports results.

Outputs:
- reports/calibration/results.csv
- reports/calibration/results.json
"""

import json
import csv
import os
import pandas as pd
from pathlib import Path
from datetime import datetime

from strategies.orb import ORBStrategy
from strategies.vwap import VWAPStrategy
from risk.guardrails import check_apex_rules

DATA_DIR = Path("data/sample_bars/")
REPORT_DIR = Path("reports/calibration/")
REPORT_DIR.mkdir(parents=True, exist_ok=True)

def sweep_orb():
    results = []
    for window in [5, 10, 15, 30]:
        for stop_ticks in [4, 8, 12]:
            for target_r in [1, 2, 3, 4, 5]:
                strat = ORBStrategy(window=window,
                                    stop_ticks=stop_ticks,
                                    target_r=target_r)
                perf = strat.run(DATA_DIR / "ES_1m.csv")
                rules = check_apex_rules(perf)
                results.append({
                    "strategy": "ORB",
                    "window": window,
                    "stop_ticks": stop_ticks,
                    "target_r": target_r,
                    **perf,
                    **rules
                })
    return results

def sweep_vwap():
    results = []
    for band in [5, 10, 20, 50]:  # basis points
        for stop_ticks in [4, 8, 12]:
            strat = VWAPStrategy(band_bps=band,
                                 stop_ticks=stop_ticks)
            perf = strat.run(DATA_DIR / "NQ_1m.csv")
            rules = check_apex_rules(perf)
            results.append({
                "strategy": "VWAP",
                "band_bps": band,
                "stop_ticks": stop_ticks,
                **perf,
                **rules
            })
    return results

def main():
    all_results = sweep_orb() + sweep_vwap()
    df = pd.DataFrame(all_results)
    df.to_csv(REPORT_DIR / "results.csv", index=False)
    df.to_json(REPORT_DIR / "results.json", orient="records", indent=2)

    summary = {
        "generated_at": datetime.utcnow().isoformat(),
        "total_runs": len(all_results),
        "orb_runs": len([r for r in all_results if r["strategy"] == "ORB"]),
        "vwap_runs": len([r for r in all_results if r["strategy"] == "VWAP"])
    }
    with open(REPORT_DIR / "summary.json", "w") as f:
        json.dump(summary, f, indent=2)

if __name__ == "__main__":
    main()
