"""
SEO helpers: JSON-LD structured data, sitemap.xml and robots.txt.

Structured data helps Google show rich results (price, availability, brand
and FAQ answers) for the store's pages.
"""

from __future__ import annotations

from typing import Any

from .catalog import is_sold_out, price_range
from .config import SITE_URL


def _social_urls(social: dict[str, Any]) -> list[str]:
    patterns = {
        "instagram": "https://www.instagram.com/{}",
        "tiktok": "https://www.tiktok.com/@{}",
        "youtube": "https://www.youtube.com/@{}",
        "facebook": "https://www.facebook.com/{}",
    }
    return [url.format(str(social[k]).lstrip("@")) for k, url in patterns.items() if social.get(k)]


def organization_jsonld(settings: dict[str, Any]) -> dict[str, Any]:
    """Organization schema — included on every page."""
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": settings["brand"]["name"],
        "url": SITE_URL,
        "logo": f"{SITE_URL}/apple-touch-icon.png",
        "slogan": settings["brand"]["tagline"],
        "email": settings["contact"]["email"],
        "telephone": settings["contact"]["phone"],
        "sameAs": _social_urls(settings["social"]),
    }


def absolute(url: str) -> str:
    return url if url.startswith("http") else f"{SITE_URL}{url}"


def product_jsonld(product: dict[str, Any], settings: dict[str, Any], shade: dict[str, Any] | None, image: str) -> dict[str, Any]:
    """Product schema with an AggregateOffer across lengths."""
    low, high = price_range(product)
    return {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product["name"],
        "description": product.get("summary", ""),
        "sku": product["id"],
        "image": [absolute(i) for i in product.get("images") or [image]],
        "brand": {"@type": "Brand", "name": settings["brand"]["name"]},
        "color": (shade or {}).get("name"),
        "url": f"{SITE_URL}/products/{product['slug']}",
        "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": settings["commerce"]["baseCurrency"],
            "lowPrice": low,
            "highPrice": high,
            "offerCount": len(product.get("variants", [])),
            "availability": "https://schema.org/OutOfStock" if is_sold_out(product) else "https://schema.org/InStock",
        },
    }


def breadcrumb_jsonld(trail: list[tuple[str, str]]) -> dict[str, Any]:
    """Breadcrumb trail, e.g. [("Shop", "/shop"), ("Wigs", "/shop/wigs")]."""
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": f"{SITE_URL}{path}"} for i, (name, path) in enumerate(trail)
        ],
    }


def faq_jsonld(groups: list[dict[str, Any]]) -> dict[str, Any]:
    """FAQPage schema — can earn expandable answers in Google results."""
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": item["q"], "acceptedAnswer": {"@type": "Answer", "text": item["a"]}}
            for group in groups
            for item in group.get("items", [])
        ],
    }


STATIC_PATHS = ["/", "/shop", "/colour-guide", "/hair-care", "/about", "/contact", "/faq", "/shipping-returns"]


def sitemap_xml(products: list[dict[str, Any]], collections: list[dict[str, Any]]) -> str:
    """sitemap.xml generated from the live catalogue."""
    urls = [(p, "1.0" if p == "/" else "0.8") for p in STATIC_PATHS]
    urls += [(f"/shop/{c['slug']}", "0.7") for c in collections]
    urls += [(f"/products/{p['slug']}", "0.6") for p in products]
    body = "\n".join(f"  <url><loc>{SITE_URL}{loc}</loc><priority>{prio}</priority></url>" for loc, prio in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}\n</urlset>\n'


def robots_txt() -> str:
    return f"User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: {SITE_URL}/sitemap.xml\n"
