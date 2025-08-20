"""
Prism Apex Tool — Audit Logger
Centralized logging of system events, rule checks, and operator actions.
"""

import json
import logging
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

LOG_DIR = Path("logs/audit/")
LOG_DIR.mkdir(parents=True, exist_ok=True)

# configure rotating text logger
logger = logging.getLogger("audit")
if not logger.handlers:
    logger.setLevel(logging.INFO)
    text_handler = TimedRotatingFileHandler(
        LOG_DIR / "audit.log", when="midnight", utc=True, backupCount=7
    )
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    text_handler.setFormatter(formatter)
    logger.addHandler(text_handler)

    console = logging.StreamHandler()
    console.setFormatter(formatter)
    logger.addHandler(console)

JSONL_FILE = LOG_DIR / f"audit_{datetime.utcnow().date()}.jsonl"


def log_event(event_type: str, message: str, details: Optional[Dict] = None) -> None:
    """Write audit log entry to JSONL and text files."""
    entry = {
        "timestamp": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "event_type": event_type,
        "message": message,
        "details": details or {},
    }

    with open(JSONL_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")

    logger.info(f"{event_type}: {message}")
