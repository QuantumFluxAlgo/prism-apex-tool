"""Unified Notification Wrapper"""

from .slack import send_slack
from .email import send_email


def notify(subject: str, body: str):
    """Send alert to Slack and Email."""
    try:
        send_slack(f"{subject}\n{body}")
    except Exception as e:
        print("Slack error:", e)

    try:
        send_email(subject, body)
    except Exception as e:
        print("Email error:", e)
