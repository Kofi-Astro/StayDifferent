"""
Sending email (used for admin password-reset links)
===================================================

Uses plain SMTP, so it works with any email provider: Gmail / Google
Workspace (app password), Zoho, Brevo, Mailgun, Resend (SMTP), etc.

Set these environment variables (Railway → web → Variables) to switch it on:

    ADMIN_EMAIL     where reset links are sent (the owner's inbox)
    SMTP_HOST       e.g. smtp.gmail.com
    SMTP_PORT       587 (STARTTLS, default) or 465 (SSL)
    SMTP_USER       login for the SMTP server
    SMTP_PASSWORD   password / app password for the SMTP server
    SMTP_FROM       sender address, e.g. "Stay Different <hello@yourdomain.com>"
                    (defaults to SMTP_USER)

Until they're set, the "Forgot password?" page explains the other way to
reset (changing ADMIN_PASSWORD in Railway).
"""

from __future__ import annotations

import os
import smtplib
import ssl
from email.message import EmailMessage

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip()


def email_configured() -> bool:
    return bool(ADMIN_EMAIL and os.environ.get("SMTP_HOST") and os.environ.get("SMTP_USER"))


def send_email(to: str, subject: str, body: str) -> None:
    """Send a plain-text email. Raises on failure (callers log it)."""
    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ["SMTP_USER"]
    password = os.environ.get("SMTP_PASSWORD", "")
    message = EmailMessage()
    message["From"] = os.environ.get("SMTP_FROM") or user
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as smtp:
            smtp.login(user, password)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            smtp.starttls(context=context)
            smtp.login(user, password)
            smtp.send_message(message)
