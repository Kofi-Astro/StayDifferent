"""Storefront pages, SEO files and the public API."""

import json
import re

import pytest

from app.catalog import apply_filters, parse_filters
from app.money import format_money

PAGES = [
    "/",
    "/colour-guide",
    "/shop",
    "/shop/wigs",
    "/shop?texture=curly&sort=price-desc",
    "/products/honey-rebel-straight-bundle",
    "/products/seamless-clip-in-set-smoke-signal",  # sold out
    "/about",
    "/hair-care",
    "/faq",
    "/shipping-returns",
    "/contact",
]


@pytest.mark.parametrize("path", PAGES)
def test_pages_render(client, path):
    res = client.get(path)
    assert res.status_code == 200
    html = res.text
    assert "<title>" in html and 'rel="canonical"' in html and "og:image" in html
    assert 'href="#main"' in html  # skip link
    # Every JSON-LD block must be valid JSON
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        json.loads(block)


@pytest.mark.parametrize("path", ["/nope", "/shop/nope", "/products/nope"])
def test_not_found(client, path):
    res = client.get(path)
    assert res.status_code == 404
    assert "a different way" in res.text


def test_seo_files(client):
    assert "/products/honey-rebel-straight-bundle" in client.get("/sitemap.xml").text
    assert "Disallow: /admin" in client.get("/robots.txt").text


def test_hair_art(client):
    res = client.get("/art/curly/2a1a12-4a2e1f-b8743a/test.svg")
    assert res.status_code == 200 and res.headers["content-type"].startswith("image/svg")
    assert "immutable" in res.headers["cache-control"]
    assert client.get("/art/curly/notacolour-00-00/x.svg").status_code == 404


def test_colour_guide_has_all_steps(client):
    html = client.get("/colour-guide").text
    for anchor in ['id="undertone"', 'id="shades"', 'id="look"', 'id="harmony-contrast"', "data-quiz"]:
        assert anchor in html
    assert html.count("data-shade-card") == 7


def test_product_jsonld(client):
    html = client.get("/products/honey-rebel-straight-bundle").text
    assert '"@type": "Product"' in html and '"AggregateOffer"' in html


def test_search_index(client):
    data = client.get("/api/products").json()
    assert any(p["slug"] == "wild-card-curly-wig" for p in data)


def test_newsletter_validation(client):
    bad = client.post("/api/newsletter", json={"email": "nope"})
    assert bad.status_code == 400
    ok = client.post("/api/newsletter", json={"email": "Hello@Example.com"})
    assert ok.status_code == 200 and ok.json()["ok"]


def test_contact_validation(client):
    res = client.post("/api/contact", json={"name": "", "email": "x", "message": "hi"})
    assert res.status_code == 400
    assert set(res.json()["errors"]) == {"name", "email", "message"}


def test_checkout_uses_live_prices(client):
    # The browser claims a price, but the server always uses the real one.
    res = client.post("/api/checkout", json={"currency": "USD", "items": [{"productId": "p001", "length": 12, "qty": 2, "price": 1}]})
    assert res.status_code == 200
    body = res.json()
    assert body["mode"] == "whatsapp" and "wa.me" in body["url"]
    assert "%24158" in body["url"]  # 2 × $79


def test_checkout_rejects_sold_out(client):
    res = client.post("/api/checkout", json={"items": [{"productId": "p014", "length": 16, "qty": 1}]})
    assert res.status_code == 400


def test_money_formatting():
    assert format_money(189, {"code": "USD", "rate": 1}) == "$189"
    assert format_money(189, {"code": "GBP", "rate": 0.79}) == "£149"
    assert format_money(1000, {"code": "XYZ", "rate": 1}) == "XYZ 1,000"


def test_filters():
    products = [
        {"name": "A", "slug": "a", "texture": "curly", "shade": "x", "variants": [{"length": 18, "price": 100, "stock": 1}]},
        {"name": "B", "slug": "b", "texture": "straight", "shade": "y", "variants": [{"length": 22, "price": 300, "stock": 0}]},
    ]
    f = parse_filters({"texture": "curly"})
    assert [p["slug"] for p in apply_filters(products, f, {})] == ["a"]
    f = parse_filters({"available": "1"})
    assert [p["slug"] for p in apply_filters(products, f, {})] == ["a"]
    f = parse_filters({"price": "250-", "sort": "price-desc"})
    assert [p["slug"] for p in apply_filters(products, f, {})] == ["b"]
