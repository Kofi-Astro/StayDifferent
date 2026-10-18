"""
Admin authentication
====================

A single password (env var ADMIN_PASSWORD) protects /admin. After logging in,
the browser gets a signed, HTTP-only session cookie:

    <expiry-timestamp>.<HMAC-SHA256 signature>

The signature uses ADMIN_SECRET, so the cookie can't be forged or extended.
Password comparison is constant-time, and login attempts are rate-limited.

Mutating admin requests also must come from this site (Origin check), which
blocks cross-site request forgery on top of the SameSite cookie.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from urllib.parse import urlparse

from fastapi import HTTPException, Request

from .config import ADMIN_PASSWORD, ADMIN_SECRET, IS_PRODUCTION, SESSION_HOURS

COOKIE_NAME = "sd_admin"


def admin_enabled() -> bool:
    """The admin is disabled in production until ADMIN_PASSWORD is set."""
    return bool(ADMIN_PASSWORD)


def check_password(password: str) -> bool:
    return admin_enabled() and hmac.compare_digest(password.encode(), ADMIN_PASSWORD.encode())


def _sign(value: str) -> str:
    return hmac.new(ADMIN_SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()


def make_session() -> str:
    expires = str(int(time.time()) + SESSION_HOURS * 3600)
    return f"{expires}.{_sign(expires)}"


def is_logged_in(request: Request) -> bool:
    token = request.cookies.get(COOKIE_NAME, "")
    expires, _, signature = token.partition(".")
    if not expires.isdigit() or not signature:
        return False
    return hmac.compare_digest(signature, _sign(expires)) and int(expires) > time.time()


def cookie_options() -> dict:
    return {
        "key": COOKIE_NAME,
        "httponly": True,
        "samesite": "strict",
        "secure": IS_PRODUCTION,
        "max_age": SESSION_HOURS * 3600,
        "path": "/admin",
    }


def same_origin(request: Request) -> bool:
    """True when a state-changing request came from this site."""
    origin = request.headers.get("origin") or request.headers.get("referer")
    if not origin:
        return False
    return urlparse(origin).netloc == request.headers.get("host", request.url.netloc)


def require_admin(request: Request) -> None:
    """FastAPI dependency for admin API routes: 401 if not logged in, 403 on CSRF."""
    if not is_logged_in(request):
        raise HTTPException(401, "Please log in again.")
    if request.method not in {"GET", "HEAD", "OPTIONS"} and not same_origin(request):
        raise HTTPException(403, "Request blocked (cross-site).")
