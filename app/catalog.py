"""
Catalogue helpers: stock & price logic, plus shop filtering and sorting.

The browser has a JavaScript twin of the filter/sort logic
(``public/js/shared/filter.js``) so the Shop grid can update instantly. If you
change the rules here, mirror them there.
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

Product = dict[str, Any]
Variant = dict[str, Any]

#: Price bands in BASE currency. Labels are formatted per currency in the UI.
PRICE_BANDS = [
    {"value": "0-150", "min": 0, "max": 150},
    {"value": "150-250", "min": 150, "max": 250},
    {"value": "250-", "min": 250, "max": float("inf")},
]

SORTS = [
    {"value": "featured", "label": "Featured"},
    {"value": "newest", "label": "Newest"},
    {"value": "price-asc", "label": "Price: low to high"},
    {"value": "price-desc", "label": "Price: high to low"},
    {"value": "name", "label": "Name A–Z"},
]


# ---------------------------------------------------------------------------
# Stock & price
# ---------------------------------------------------------------------------


def variant_available(product: Product, variant: Variant | None) -> bool:
    """Can this length be ordered right now?"""
    return bool(variant) and (variant.get("stock", 0) > 0 or bool(product.get("allowPreorder")))


def is_sold_out(product: Product) -> bool:
    """True when no length can be ordered."""
    return not any(variant_available(product, v) for v in product.get("variants", []))


def total_stock(product: Product) -> int:
    return sum(int(v.get("stock") or 0) for v in product.get("variants", []))


def price_range(product: Product) -> tuple[float, float]:
    """(lowest, highest) price across lengths."""
    prices = [float(v.get("price") or 0) for v in product.get("variants", [])]
    return (min(prices), max(prices)) if prices else (0.0, 0.0)


def default_variant(product: Product) -> Variant | None:
    """The first orderable length (pre-selected on the product page)."""
    variants = product.get("variants", [])
    return next((v for v in variants if variant_available(product, v)), variants[0] if variants else None)


def on_sale(product: Product) -> bool:
    return any((v.get("compareAt") or 0) > v.get("price", 0) for v in product.get("variants", []))


def label_for(options: Iterable[dict[str, str]], value: str) -> str:
    """Look up a label in a [{value, label}] list, falling back to a prettified value."""
    for option in options:
        if option.get("value") == value:
            return option.get("label", value)
    return str(value or "").replace("-", " ").title()


def stock_message(product: Product, variant: Variant | None, low_stock: int) -> dict[str, str]:
    """Message under the length picker. Mirrored in public/js/client/product.js."""
    if not variant:
        return {"text": "Sold out", "state": "out"}
    stock = int(variant.get("stock") or 0)
    if 0 < stock <= low_stock:
        return {"text": f"Only {stock} left — order soon", "state": "low"}
    if stock > 0:
        return {"text": "In stock — ships in 1–2 business days", "state": "in"}
    if product.get("allowPreorder"):
        return {"text": "Pre-order — ships in 2–3 weeks", "state": "pre"}
    return {"text": "Sold out in this length", "state": "out"}


# ---------------------------------------------------------------------------
# Shop filters
# ---------------------------------------------------------------------------


def _as_list(value: Any) -> list[str]:
    """A query value may be a string, list or comma-separated list → list of strings."""
    if not value:
        return []
    items = value if isinstance(value, list) else str(value).split(",")
    return [str(v).strip() for v in items if str(v).strip()]


def parse_filters(query: dict[str, Any]) -> dict[str, Any]:
    """Normalise URL query params like ?texture=curly&length=18,20&sort=price-asc."""
    lengths = []
    for raw in _as_list(query.get("length")):
        try:
            lengths.append(int(float(raw)))
        except ValueError:
            pass
    sort = query.get("sort") or "featured"
    return {
        "texture": _as_list(query.get("texture")),
        "shade": _as_list(query.get("shade")),
        "length": lengths,
        "price": _as_list(query.get("price")),
        "available": str(query.get("available", "")) in {"1", "true"},
        "sort": sort if any(s["value"] == sort for s in SORTS) else "featured",
        "q": str(query.get("q") or "").strip()[:80],
    }


def active_filter_count(f: dict[str, Any]) -> int:
    return len(f["texture"]) + len(f["shade"]) + len(f["length"]) + len(f["price"]) + (1 if f["available"] else 0)


def apply_filters(products: list[Product], f: dict[str, Any], shades: dict[str, Any]) -> list[Product]:
    """Filter + sort products for the Shop page."""
    words = [w for w in f["q"].lower().split() if w]
    bands = [b for b in PRICE_BANDS if b["value"] in f["price"]]

    def keep(p: Product) -> bool:
        if f["texture"] and p.get("texture") not in f["texture"]:
            return False
        if f["shade"] and p.get("shade") not in f["shade"]:
            return False
        if f["length"] and not any(int(v["length"]) in f["length"] for v in p.get("variants", [])):
            return False
        if bands:
            low = price_range(p)[0]
            if not any(b["min"] <= low < b["max"] for b in bands):
                return False
        if f["available"] and is_sold_out(p):
            return False
        if words:
            shade_name = shades.get(p.get("shade"), {}).get("name", "")
            hay = f"{p['name']} {p.get('summary', '')} {p.get('texture', '')} {p.get('type', '')} {shade_name}".lower()
            if not all(w in hay for w in words):
                return False
        return True

    result = [p for p in products if keep(p)]
    sort = f["sort"]
    if sort == "newest":
        return sorted(result, key=lambda p: str(p.get("createdAt", "")), reverse=True)
    if sort == "price-asc":
        return sorted(result, key=lambda p: price_range(p)[0])
    if sort == "price-desc":
        return sorted(result, key=lambda p: price_range(p)[0], reverse=True)
    if sort == "name":
        return sorted(result, key=lambda p: p["name"].lower())
    # "Featured": in stock first, then bestsellers, otherwise catalogue order.
    return sorted(result, key=lambda p: (is_sold_out(p), not p.get("bestseller")))
