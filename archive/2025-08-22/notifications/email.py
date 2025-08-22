"""Email Notifications for Prism Apex Tool"""

import smtplib
from email.mime.text import MIMEText

from .config import settings


def send_email(subject: str, body: str):
    """Send an email alert via SMTP."""
    required = [
        settings.smtp_server,
        settings.smtp_user,
        settings.smtp_pass,
        settings.email_from,
        settings.email_to,
    ]
    if not all(required):
        raise RuntimeError("SMTP settings incomplete")

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.email_from
    msg["To"] = settings.email_to

    with smtplib.SMTP(settings.smtp_server, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_pass)
        server.send_message(msg)
