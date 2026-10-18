"""
Minimal in-memory rate limiter (no extra dependencies).

Limits how many requests one IP address can make to a route per window —
enough to stop form spam and password guessing on a single-server site.
Usage::

    @router.post("/contact", dependencies=[rate_limit("contact", 5)])
"""

from __future__ import annotations

import time

from fastapi import Depends, HTTPException, Request

_hits: dict[str, tuple[int, float]] = {}


def client_ip(request: Request) -> str:
    """The visitor's IP. Behind Railway's proxy this is correct because uvicorn
    runs with --proxy-headers (see the start command in railway.json)."""
    return request.client.host if request.client else "unknown"


def rate_limit(name: str, limit: int, window_seconds: int = 15 * 60):
    """FastAPI dependency allowing `limit` requests per IP per window."""

    def check(request: Request) -> None:
        now = time.monotonic()
        key = f"{name}:{client_ip(request)}"
        count, reset = _hits.get(key, (0, now + window_seconds))
        if reset < now:
            count, reset = 0, now + window_seconds
        count += 1
        _hits[key] = (count, reset)
        if len(_hits) > 10_000:  # occasional sweep so memory can't grow forever
            for k, (_, r) in list(_hits.items()):
                if r < now:
                    _hits.pop(k, None)
        if count > limit:
            raise HTTPException(
                429, "Too many attempts. Please wait a few minutes and try again.", headers={"Retry-After": str(int(reset - now))}
            )

    return Depends(check)
