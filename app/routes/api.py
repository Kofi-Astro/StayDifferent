"""
Public JSON API
===============

    GET  /api/products     lightweight product index for the search overlay
    POST /api/newsletter   newsletter sign-up
    POST /api/contact      contact form
    POST /api/checkout     checkout (stub — see the TODO below)

Every submission is validated on the server (never trust the browser) and
saved to DATA_DIR/submissions.json, where the owner sees it in Admin → Inbox.
Forms post JSON (from JavaScript) or classic form data (no-JS fallback).
"""

from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

from .. import catalog
from ..data import get_collections, get_products, get_settings, get_shade_map
from ..money import find_currency, format_money
from ..ratelimit import rate_limit
from ..render import whatsapp_url
from ..store import add_submission

router = APIRouter(prefix="/api")

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


def clean(value: Any, limit: int = 500) -> str:
    """Trim + cap a string field so nobody can store megabytes of text."""
    return str(value or "").strip()[:limit]


async def read_body(request: Request) -> dict[str, Any]:
    """Accept JSON (fetch) or form data (no-JS form post)."""
    if request.headers.get("content-type", "").startswith("application/json"):
        try:
            data = await request.json()
            return data if isinstance(data, dict) else {}
        except ValueError:
            return {}
    form = await request.form()
    return dict(form)


def respond(request: Request, status: int, body: dict[str, Any]):
    """fetch() callers get JSON; a no-JS form post is redirected back."""
    if request.headers.get("content-type", "").startswith("application/json"):
        return JSONResponse(body, status_code=status)
    return RedirectResponse(request.headers.get("referer") or "/", status_code=303)


# ---------------------------------------------------------------------------
@router.get("/products")
def product_index():
    """Search index — fetched the first time someone opens the search overlay."""
    shades = get_shade_map()
    names = {c["slug"]: c["name"] for c in get_collections()}
    items = []
    for p in get_products():
        shade = shades.get(p.get("shade"), {})
        items.append(
            {
                "slug": p["slug"],
                "name": p["name"],
                "summary": p.get("summary", ""),
                "shade": shade.get("name", ""),
                "swatch": shade.get("swatch"),
                "texture": p.get("texture"),
                "image": (p.get("images") or [""])[0],
                "from": catalog.price_range(p)[0],
                "soldOut": catalog.is_sold_out(p),
                "keywords": " ".join(filter(None, [*(names.get(c) for c in p.get("collections", [])), shade.get("family"), p.get("type")])),
            }
        )
    return JSONResponse(items, headers={"Cache-Control": "public, max-age=60"})


# ---------------------------------------------------------------------------
@router.post("/newsletter", dependencies=[rate_limit("newsletter", 10)])
async def newsletter(request: Request):
    data = await read_body(request)
    if data.get("company"):  # honeypot filled in → a bot; pretend success
        return respond(request, 200, {"ok": True})
    email = clean(data.get("email"), 200).lower()
    if not EMAIL_RE.match(email):
        return respond(request, 400, {"error": "Please enter a valid email address."})
    add_submission("newsletter", {"email": email})
    # TODO: forward to your email platform (Klaviyo, Mailchimp…) here.
    return respond(request, 200, {"ok": True, "message": "You're on the list. Welcome to the different ones."})


# ---------------------------------------------------------------------------
@router.post("/contact", dependencies=[rate_limit("contact", 5)])
async def contact(request: Request):
    data = await read_body(request)
    if data.get("company"):
        return respond(request, 200, {"ok": True})
    entry = {
        "name": clean(data.get("name"), 120),
        "email": clean(data.get("email"), 200).lower(),
        "topic": clean(data.get("topic"), 120),
        "orderNumber": clean(data.get("orderNumber"), 60),
        "message": clean(data.get("message"), 4000),
    }
    errors = {}
    if not entry["name"]:
        errors["name"] = "Please tell us your name."
    if not EMAIL_RE.match(entry["email"]):
        errors["email"] = "Please enter a valid email address."
    if len(entry["message"]) < 10:
        errors["message"] = "Your message needs at least 10 characters."
    if errors:
        return respond(request, 400, {"error": "Please check the highlighted fields.", "errors": errors})
    add_submission("contact", entry)
    # TODO: send an email notification to the business here (e.g. Resend / SendGrid).
    return respond(request, 200, {"ok": True, "message": "Message received! We will get back to you within one business day."})


# ---------------------------------------------------------------------------
@router.post("/checkout", dependencies=[rate_limit("checkout", 20)])
async def checkout(request: Request):
    """Checkout stub.

    Re-checks the bag against LIVE prices & stock (the browser's copy could be
    stale or tampered with) and saves an order request. Then, depending on
    Admin → Settings → Checkout button:
      - 'whatsapp': returns a WhatsApp link with the order pre-filled
      - 'disabled': returns the "coming soon" message

    TODO: payment integration — create a Stripe Checkout Session / Paystack
    transaction here from `lines` and `subtotal`, and return its URL instead.
    """
    data = await read_body(request)
    settings = get_settings()
    commerce = settings["commerce"]
    products = {p["id"]: p for p in get_products()}
    shades = get_shade_map()
    currency = find_currency(commerce["currencies"], clean(data.get("currency"), 3) or commerce["defaultCurrency"])

    lines, problems = [], []
    for item in (data.get("items") or [])[:50]:
        if not isinstance(item, dict):
            continue
        product = products.get(item.get("productId"))
        try:
            length = int(float(item.get("length")))
            qty = max(1, min(20, int(item.get("qty") or 1)))
        except (TypeError, ValueError):
            continue
        variant = next((v for v in (product or {}).get("variants", []) if int(v["length"]) == length), None)
        if not product or not variant:
            problems.append("An item in your bag is no longer available.")
            continue
        if not catalog.variant_available(product, variant):
            problems.append(f'{product["name"]} ({length}") just sold out.')
            continue
        stock = int(variant.get("stock") or 0)
        if 0 < stock < qty and not product.get("allowPreorder"):
            problems.append(f'Only {stock} left of {product["name"]} ({length}").')
            continue
        lines.append(
            {
                "productId": product["id"],
                "name": product["name"],
                "shade": shades.get(product.get("shade"), {}).get("name", ""),
                "length": length,
                "qty": qty,
                "price": variant["price"],
                "preorder": stock <= 0,
            }
        )

    if not lines:
        return JSONResponse({"error": problems[0] if problems else "Your bag is empty."}, status_code=400)

    subtotal = sum(line["price"] * line["qty"] for line in lines)
    order = add_submission(
        "orders",
        {"status": "pending", "currency": currency["code"], "subtotal": subtotal, "lines": lines, "channel": commerce["checkoutMode"]},
    )

    if commerce.get("checkoutMode") == "whatsapp" and settings["contact"].get("whatsapp"):
        ref = order["id"][:8].upper()
        message_lines = [f"Hi {settings['brand']['name']}! I'd like to order (ref {ref}):"]
        for line in lines:
            shade = f" — {line['shade']}" if line["shade"] else ""
            pre = " (pre-order)" if line["preorder"] else ""
            message_lines.append(
                f'• {line["qty"]} × {line["name"]}{shade}, {line["length"]}" — {format_money(line["price"] * line["qty"], currency)}{pre}'
            )
        message_lines.append(f"Subtotal: {format_money(subtotal, currency)}")
        return {"ok": True, "mode": "whatsapp", "url": whatsapp_url(settings["contact"], "\n".join(message_lines)), "warnings": problems}

    return {"ok": True, "mode": "disabled", "message": commerce.get("checkoutMessage", ""), "warnings": problems}
