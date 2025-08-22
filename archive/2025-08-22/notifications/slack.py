"""Slack Notifications for Prism Apex Tool"""

import requests

from .config import settings


def send_slack(message: str):
    """Send a message to Slack via webhook."""
    if not settings.slack_webhook:
        raise RuntimeError("SLACK_WEBHOOK not set")
    payload = {"text": message}
    resp = requests.post(str(settings.slack_webhook), json=payload, timeout=10)
    resp.raise_for_status()
    return resp.text
