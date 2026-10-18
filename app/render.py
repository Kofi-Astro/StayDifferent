"""
Template rendering (Jinja2)
===========================

Pages are plain HTML files in ``templates/`` with ``{{ placeholders }}``. This
module sets up Jinja and the small helpers templates can call, e.g.::

    {{ icon('arrow', 'icon--sm') }}          inline SVG icon
    {{ money(189) }}                          "$189" in the default currency
    {{ heading | split_heading }}             "Line one|line two" → two-line heading
    {{ body | paragraphs }}                   blank lines → <p> paragraphs
    {{ url | safe_url }}                      blocks javascript: links

SAFETY: autoescaping is ON, so text typed into the admin (e.g. a product
named "<script>") is always shown as text, never run.
"""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import quote

from fastapi import Request
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup, escape

from . import catalog
from .art import art_url, icon
from .config import ASSET_VERSION, FOOTER_NAV, MAIN_NAV, SITE_URL, TEMPLATE_DIR
from .data import get_layout_data
from .money import find_currency, format_money
from .seo import organization_jsonld

env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


# ---------------------------------------------------------------------------
# Filters
# ---------------------------------------------------------------------------


def split_heading(text: str) -> Markup:
    """'Know your|undertone' → two lines, the second in italic accent."""
    first, _, second = str(text or "").partition("|")
    if second.strip():
        return Markup('<span class="h-line">{}</span> <em class="h-line h-accent">{}</em>').format(first.strip(), second.strip())
    return Markup(escape(first.strip()))


def paragraphs(text: str, class_name: str = "") -> Markup:
    """Admin textarea → paragraphs (a blank line starts a new one)."""
    parts = [p.strip() for p in re.split(r"\n\s*\n", str(text or "")) if p.strip()]
    cls = Markup(f' class="{escape(class_name)}"') if class_name else ""
    return Markup("").join(Markup("<p{}>{}</p>").format(cls, p) for p in parts)


def safe_url(url: str) -> str:
    """Allow site paths, #anchors, http(s), mailto: and tel: links only."""
    value = str(url or "").strip()
    if re.match(r"^(/(?!/)|#|\?)", value) or re.match(r"^(https?:|mailto:|tel:)", value, re.I):
        return value
    return "#"


def json_script(data: Any) -> Markup:
    """Serialise data for an inline <script type="application/json">.
    Escaping "<" stops a "</script>" in content from closing the tag."""
    return Markup(json.dumps(data, ensure_ascii=False).replace("<", "\\u003c"))


env.filters.update(split_heading=split_heading, paragraphs=paragraphs, safe_url=safe_url, json_script=json_script)


# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------


def whatsapp_url(contact: dict[str, Any], message: str | None = None) -> str:
    """WhatsApp click-to-chat link with an optional pre-filled message."""
    number = re.sub(r"\D", "", str(contact.get("whatsapp", "")))
    text = contact.get("whatsappMessage", "") if message is None else message
    return f"https://wa.me/{number}" + (f"?text={quote(text)}" if text else "")


def social_links(social: dict[str, Any]) -> list[dict[str, str]]:
    """Social profile links from settings (blank handles are skipped)."""
    patterns = [
        ("instagram", "Instagram", "https://www.instagram.com/{}"),
        ("tiktok", "TikTok", "https://www.tiktok.com/@{}"),
        ("youtube", "YouTube", "https://www.youtube.com/@{}"),
        ("facebook", "Facebook", "https://www.facebook.com/{}"),
    ]
    return [
        {"key": key, "label": label, "href": url.format(str(social[key]).lstrip("@"))} for key, label, url in patterns if social.get(key)
    ]


def asset(path: str) -> str:
    """Versioned static URL so browsers re-download CSS/JS after each deploy."""
    return f"{path}?v={ASSET_VERSION}"


def tel(phone: str) -> str:
    return re.sub(r"[^\d+]", "", str(phone or ""))


env.globals.update(
    icon=icon,
    art_url=art_url,
    whatsapp_url=whatsapp_url,
    social_links=social_links,
    asset=asset,
    tel=tel,
    main_nav=MAIN_NAV,
    footer_nav=FOOTER_NAV,
    site_url=SITE_URL,
    price_range=catalog.price_range,
    is_sold_out=catalog.is_sold_out,
    on_sale=catalog.on_sale,
    variant_available=catalog.variant_available,
    label_for=catalog.label_for,
)


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------


def render_page(
    request: Request,
    template: str,
    *,
    meta: dict[str, Any] | None = None,
    jsonld: list[dict[str, Any]] | None = None,
    client_data: dict[str, Any] | None = None,
    status_code: int = 200,
    **context: Any,
) -> HTMLResponse:
    """Render a storefront page inside templates/base.html.

    ``meta``         title / description / image / type / noindex for <head>
    ``jsonld``       extra structured data (Organization is always included)
    ``client_data``  extra JSON for the page's browser script (window data)
    """
    layout = get_layout_data()
    settings = layout["settings"]
    commerce = settings["commerce"]
    currency = find_currency(commerce["currencies"], commerce["defaultCurrency"])

    # Only what the browser needs — never admin-only values.
    browser_data = {
        "settings": {"commerce": commerce, "contact": {"whatsapp": settings["contact"]["whatsapp"]}},
        **(client_data or {}),
    }

    html = env.get_template(template).render(
        request=request,
        path=request.url.path,
        meta=meta or {},
        jsonld=[organization_jsonld(settings), *(jsonld or [])],
        client_data=browser_data,
        currency=currency,
        # money(189) → "$189" in the default currency (the browser re-formats
        # every [data-price] element if the shopper picks another currency).
        money=lambda amount: format_money(amount, currency),
        **layout,
        **context,
    )
    # Pages are rendered fresh each time, so admin edits show up immediately.
    return HTMLResponse(html, status_code=status_code, headers={"Cache-Control": "no-cache"})
