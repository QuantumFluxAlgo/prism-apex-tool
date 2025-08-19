"""
Simple VWAP strategy placeholder for calibration sweeps.
"""

import pandas as pd
from pathlib import Path

class VWAPStrategy:
    def __init__(self, band_bps: int, stop_ticks: int):
        self.band_bps = band_bps
        self.stop_ticks = stop_ticks

    def run(self, data_path: Path | str) -> dict:
        df = pd.read_csv(data_path)
        return {
            "win_rate": 0.52,
            "expectancy": 40.0,
            "max_daily_loss": 500,
            "daily_loss_cap": 1000,
            "max_dd": 1000,
            "trailing_dd": 2500,
            "open_positions_at_eod": False,
            "consistency_pct": 20
        }
