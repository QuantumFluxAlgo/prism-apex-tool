"""Notification settings loaded from environment"""
from pydantic import EmailStr, AnyHttpUrl
from pydantic_settings import BaseSettings


class NotificationSettings(BaseSettings):
    """Environment-based settings for notifications."""
    slack_webhook: AnyHttpUrl | None = None
    smtp_server: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_pass: str | None = None
    email_from: EmailStr | None = None
    email_to: EmailStr | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = NotificationSettings()
