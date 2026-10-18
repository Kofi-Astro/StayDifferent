"""
Admin authentication
====================

Where the password comes from
-----------------------------
1. ``ADMIN_PASSWORD`` (environment variable) is the starting password.
2. The owner can change it in the admin (Account page) or via the
   "Forgot password?" email link. The new password is stored — hashed with
   PBKDF2, never in plain text — in ``DATA_DIR/admin-auth.json`` and from then
   on takes priority.
3. Lost access and no email set up? Change ``ADMIN_PASSWORD`` in Railway.
   We remember a fingerprint of the env password that was active when the
   password was last changed; if the env value is different, the env value
   wins again. So the hosting dashboard is always a way back in.

Sessions
--------
After logging in, the browser gets a signed, HTTP-only cookie::

    <expiry>.<HMAC(expiry + password-version)>

Because the signature includes a fingerprint of the current password,
changing the password signs every other device out.

Mutating admin requests must also come from this site (Origin check), which
blocks cross-site request forgery on top of the SameSite cookie.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import time
from urllib.parse import urlparse

from fastapi import HTTPException, Request

from .config import ADMIN_PASSWORD, ADMIN_SECRET, DATA_DIR, IS_PRODUCTION, SESSION_HOURS

COOKIE_NAME = "sd_admin"
AUTH_FILE = DATA_DIR / "admin-auth.json"
PBKDF2_ROUNDS = 240_000
MIN_PASSWORD_LENGTH = 8
RESET_LINK_MINUTES = 30


def _sign(value: str) -> str:
    return hmac.new(ADMIN_SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()


def _env_fingerprint() -> str:
    """Identifies the current ADMIN_PASSWORD env value without storing it."""
    return _sign(f"env:{ADMIN_PASSWORD}")


def _hash(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ROUNDS).hex()


def _stored() -> dict | None:
    """The password saved from the admin, if it is still in force."""
    try:
        data = json.loads(AUTH_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return None
    # ADMIN_PASSWORD changed in the hosting dashboard since → env wins again.
    if data.get("env") != _env_fingerprint():
        return None
    return data


def admin_enabled() -> bool:
    """The admin is switched off until a password exists."""
    return bool(ADMIN_PASSWORD) or _stored() is not None


def password_version() -> str:
    """Changes whenever the password changes (used to sign sessions and reset links)."""
    stored = _stored()
    return stored["hash"][:16] if stored else _env_fingerprint()[:16]


def check_password(password: str) -> bool:
    """Constant-time check against the active password."""
    stored = _stored()
    if stored:
        candidate = _hash(password, bytes.fromhex(stored["salt"]))
        return hmac.compare_digest(candidate, stored["hash"])
    return bool(ADMIN_PASSWORD) and hmac.compare_digest(password.encode(), ADMIN_PASSWORD.encode())


def set_password(new_password: str) -> None:
    """Save a new admin password (hashed). Signs out all existing sessions."""
    if len(new_password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Use at least {MIN_PASSWORD_LENGTH} characters.")
    salt = secrets.token_bytes(16)
    data = {"salt": salt.hex(), "hash": _hash(new_password, salt), "env": _env_fingerprint(), "changedAt": int(time.time())}
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = AUTH_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data), encoding="utf-8")
    os.replace(tmp, AUTH_FILE)


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------


def make_session() -> str:
    expires = str(int(time.time()) + SESSION_HOURS * 3600)
    return f"{expires}.{_sign(f'session:{expires}:{password_version()}')}"


def is_logged_in(request: Request) -> bool:
    token = request.cookies.get(COOKIE_NAME, "")
    expires, _, signature = token.partition(".")
    if not expires.isdigit() or not signature:
        return False
    expected = _sign(f"session:{expires}:{password_version()}")
    return hmac.compare_digest(signature, expected) and int(expires) > time.time()


def cookie_options() -> dict:
    return {
        "key": COOKIE_NAME,
        "httponly": True,
        "samesite": "strict",
        "secure": IS_PRODUCTION,
        "max_age": SESSION_HOURS * 3600,
        "path": "/admin",
    }


# ---------------------------------------------------------------------------
# Password reset links
# ---------------------------------------------------------------------------


def make_reset_token() -> str:
    """A link token valid for RESET_LINK_MINUTES. It stops working as soon as
    the password changes, so each link can only be used once."""
    expires = str(int(time.time()) + RESET_LINK_MINUTES * 60)
    return f"{expires}.{_sign(f'reset:{expires}:{password_version()}')}"


def check_reset_token(token: str) -> bool:
    expires, _, signature = (token or "").partition(".")
    if not expires.isdigit() or not signature:
        return False
    expected = _sign(f"reset:{expires}:{password_version()}")
    return hmac.compare_digest(signature, expected) and int(expires) > time.time()


# ---------------------------------------------------------------------------
# Request guards
# ---------------------------------------------------------------------------


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
