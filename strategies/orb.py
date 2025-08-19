"""
Simple ORB strategy placeholder for calibration sweeps.
"""

import pandas as pd
from pathlib import Path

class ORBStrategy:
    def __init__(self, window: int, stop_ticks: int, target_r: int):
        self.window = window
        self.stop_ticks = stop_ticks
        self.target_r = target_r

    def run(self, data_path: Path | str) -> dict:
        df = pd.read_csv(data_path)
        return {
            "win_rate": 0.55,
            "expectancy": 50.0,
            "max_daily_loss": 500,
            "daily_loss_cap": 1000,
            "max_dd": 1000,
            "trailing_dd": 2500,
            "open_positions_at_eod": False,
            "consistency_pct": 20
        }
