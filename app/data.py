"""
Data access layer — THE place pages get content from
====================================================

Every page and API route reads content through these functions, never from
``/data`` or the store directly. That makes this module the single swap point
for a headless CMS: change these function bodies to fetch from the CMS and
return the same shapes (see the README's "Content model" section).
"""

from __future__ import annotations

from typing import Any

from .store import get_default, get_section


def _deep_merge(base: Any, override: Any) -> Any:
    """Recursively merge ``override`` onto ``base`` (lists are replaced, not merged)."""
    if isinstance(base, dict) and isinstance(override, dict):
        merged = dict(base)
        for key, value in override.items():
            merged[key] = _deep_merge(base.get(key), value)
        return merged
    return base if override is None else override


def get_settings() -> dict[str, Any]:
    """Site settings: saved values merged over the defaults in data/settings.json,
    so any new setting added there is always present."""
    return _deep_merge(get_default("settings"), get_section("settings"))


def get_products(include_hidden: bool = False) -> list[dict[str, Any]]:
    """Products. The admin passes ``include_hidden=True`` to see drafts."""
    products = get_section("products")
    return products if include_hidden else [p for p in products if p.get("status") == "active"]


def get_product(slug: str) -> dict[str, Any] | None:
    """One active product by slug."""
    return next((p for p in get_products() if p["slug"] == slug), None)


def get_shades() -> list[dict[str, Any]]:
    return get_section("shades")


def get_shade_map() -> dict[str, dict[str, Any]]:
    """Shades as a ``{slug: shade}`` lookup."""
    return {s["slug"]: s for s in get_shades()}


def get_collections() -> list[dict[str, Any]]:
    return get_section("collections")


def get_page(key: str) -> dict[str, Any]:
    """Page copy: 'home' | 'about' | 'hairCare' | 'faq' | 'shipping' | 'contactPage' | 'colourGuide'."""
    return get_section(key)


def get_layout_data() -> dict[str, Any]:
    """Everything the shared layout (header, footer, cart) needs on every page."""
    return {"settings": get_settings(), "collections": get_collections(), "shades": get_shade_map()}
