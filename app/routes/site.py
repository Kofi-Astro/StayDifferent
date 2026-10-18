"""
Storefront routes — one function per page.

Each route gathers the content it needs (via app/data.py) and renders a
Jinja template from templates/pages/. Returning a 404 page for unknown
products/collections keeps search engines and shoppers on track.
"""

from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from markupsafe import Markup

from .. import catalog
from ..art import art_url, hair_art_svg
from ..data import get_collections, get_page, get_product, get_products, get_settings, get_shade_map
from ..render import env, paragraphs, render_page
from ..seo import breadcrumb_jsonld, faq_jsonld, product_jsonld, robots_txt, sitemap_xml

router = APIRouter()

# Small template helper: FAQ/shipping items {q, a} → accordion items {title, body}.
env.filters["qa_item"] = lambda item: {"title": item.get("q", ""), "body": item.get("a", "")}


def not_found(request: Request) -> HTMLResponse:
    """Branded 404 page."""
    return render_page(request, "pages/not_found.html", meta={"title": "Page not found", "noindex": True}, status_code=404)


# ---------------------------------------------------------------------------
# Home
# ---------------------------------------------------------------------------
@router.get("/", response_class=HTMLResponse)
def home(request: Request):
    products = get_products()
    best = [p for p in products if p.get("bestseller")]
    # Show 4 or 8 so the 4-column desktop grid never has a gap.
    bestsellers = best[: 8 if len(best) >= 8 else 4]
    return render_page(request, "pages/home.html", home=get_page("home"), bestsellers=bestsellers)


# ---------------------------------------------------------------------------
# Colour Guide
# ---------------------------------------------------------------------------
@router.get("/colour-guide", response_class=HTMLResponse)
def colour_guide(request: Request):
    guide = get_page("colourGuide")
    shades = get_shade_map()
    products = get_products()

    # Undertone cards: attach the matching shade objects + a colour band.
    undertone_cards = []
    for u in guide.get("undertones", []):
        matches = [shades[s] for s in u.get("matches", []) if s in shades]
        band = ", ".join(f"{s['swatch']['base']}, {s['swatch']['highlight']}" for s in matches) or "#cdb89e, #e3d3bf"
        undertone_cards.append({**u, "match_shades": matches, "band": band})

    by_slug = {p["slug"]: p for p in products}
    return render_page(
        request,
        "pages/colour_guide.html",
        meta={
            "title": "Colour Guide — find your shade",
            "description": "Find your undertone in 30 seconds and discover the Stay Different shade made for you.",
        },
        jsonld=[breadcrumb_jsonld([("Home", "/"), ("Colour Guide", "/colour-guide")])],
        guide=guide,
        guide_shades=[s for s in shades.values() if s.get("inGuide")],
        undertone_cards=undertone_cards,
        live_slugs=set(by_slug),
        texture_products=[by_slug[s] for s in guide.get("texture", {}).get("products", []) if s in by_slug],
    )


# ---------------------------------------------------------------------------
# Shop (all products or one collection)
# ---------------------------------------------------------------------------
def _shop(request: Request, slug: str | None):
    settings = get_settings()
    collections = get_collections()
    collection = next((c for c in collections if c["slug"] == slug), None) if slug else None
    if slug and not collection:
        return not_found(request)

    shades = get_shade_map()
    every = get_products()
    scoped = [p for p in every if collection is None or collection["slug"] in p.get("collections", [])]

    # Query params can repeat (?texture=a&texture=b) — collect them as lists.
    query = {key: request.query_params.getlist(key) for key in request.query_params}
    query = {k: (v if len(v) > 1 else v[0]) for k, v in query.items()}
    filters = catalog.parse_filters(query)
    results = catalog.apply_filters(scoped, filters, shades)
    shown = {p["slug"] for p in results}

    # Only offer filter options that exist in this collection.
    textures = [
        {**t, "count": sum(1 for p in scoped if p.get("texture") == t["value"])}
        for t in settings["catalog"]["textures"]
        if any(p.get("texture") == t["value"] for p in scoped)
    ]
    shade_options = [s for s in shades.values() if any(p.get("shade") == s["slug"] for p in scoped)]
    lengths = sorted({int(v["length"]) for p in scoped for v in p.get("variants", [])})

    title = collection["name"] if collection else (f"Results for “{filters['q']}”" if filters["q"] else "Shop all")
    trail = [("Home", "/"), ("Shop", "/shop")] + ([(collection["name"], f"/shop/{slug}")] if collection else [])

    # Lightweight product data for the instant browser-side filtering.
    client_products = [
        {
            "slug": p["slug"],
            "name": p["name"],
            "summary": p.get("summary", ""),
            "texture": p.get("texture"),
            "type": p.get("type"),
            "shade": p.get("shade"),
            "variants": p.get("variants", []),
            "allowPreorder": p.get("allowPreorder", False),
            "bestseller": p.get("bestseller", False),
            "createdAt": p.get("createdAt", ""),
        }
        for p in scoped
    ]
    return render_page(
        request,
        "pages/shop.html",
        meta={
            "title": f"{collection['name']} hair" if collection else "Shop all hair",
            "description": (collection or {}).get("description")
            or "Shop premium human hair extensions, wigs, clip-ins, closures and frontals in original Stay Different shades.",
            # Filtered variants shouldn't compete with the main listing in search results.
            "noindex": bool(request.query_params),
        },
        jsonld=[breadcrumb_jsonld(trail)],
        client_data={
            "products": client_products,
            "shadeNames": {k: s["name"] for k, s in shades.items()},
            "path": request.url.path,
        },
        collection=collection,
        title=title,
        filters=filters,
        results=results,
        hidden_products=[p for p in scoped if p["slug"] not in shown],
        active_count=catalog.active_filter_count(filters),
        textures=textures,
        shade_options=shade_options,
        lengths=lengths,
        price_bands=catalog.PRICE_BANDS,
        sorts=catalog.SORTS,
    )


@router.get("/shop", response_class=HTMLResponse)
def shop(request: Request):
    return _shop(request, None)


@router.get("/shop/{slug}", response_class=HTMLResponse)
def shop_collection(request: Request, slug: str):
    return _shop(request, slug)


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------
@router.get("/products/{slug}", response_class=HTMLResponse)
def product_page(request: Request, slug: str):
    product = get_product(slug)
    if not product:
        return not_found(request)

    settings = get_settings()
    shades = get_shade_map()
    shade = shades.get(product.get("shade"))
    selected = catalog.default_variant(product)
    sold_out = catalog.is_sold_out(product)
    collections = get_collections()
    primary_collection = next((c for c in collections if c["slug"] in product.get("collections", [])), None)

    # Gallery: uploaded photos, or three placeholder "views".
    # TODO: replace with brand photography (upload in Admin → Products).
    images = product.get("images") or []
    views = (
        [{"image": src, "seed": f"{slug}-{i}"} for i, src in enumerate(images)]
        if images
        else [{"image": "", "seed": f"{slug}-{s}"} for s in "abc"]
    )

    # Related: shares a collection, bestsellers first.
    related = sorted(
        (p for p in get_products() if p["id"] != product["id"] and set(p.get("collections", [])) & set(product.get("collections", []))),
        key=lambda p: not p.get("bestseller"),
    )[:4]

    # Accordion: Details / Care / Shipping & Returns (summary of the policy page).
    shipping = get_page("shipping")
    details_html = Markup("<ul>{}</ul>").format(Markup("").join(Markup("<li>{}</li>").format(d) for d in product.get("details", [])))
    ship_items = [i for g in shipping.get("groups", []) for i in g.get("items", [])[:2]]
    ship_html = Markup(
        '<ul>{}</ul><p><a class="link-underline" href="/shipping-returns">Full shipping &amp; returns policy</a></p>'
    ).format(Markup("").join(Markup("<li><strong>{}:</strong> {}</li>").format(i["q"], i["a"]) for i in ship_items))
    info_items = [
        {"title": "Details", "html": details_html},
        {"title": "Care", "html": paragraphs(product.get("care", ""))},
        {"title": "Shipping & Returns", "html": ship_html},
    ]

    first_image = images[0] if images else art_url((shade or {}).get("swatch"), product.get("texture", "straight"), f"{slug}-a")
    return render_page(
        request,
        "pages/product.html",
        meta={"title": product["name"], "description": product.get("summary", ""), "type": "product", "image": images[0] if images else ""},
        jsonld=[
            product_jsonld(product, settings, shade, first_image),
            breadcrumb_jsonld([("Home", "/"), ("Shop", "/shop"), (product["name"], f"/products/{slug}")]),
        ],
        client_data={
            "product": {
                "id": product["id"],
                "slug": slug,
                "name": product["name"],
                "texture": product.get("texture"),
                "image": images[0] if images else "",
                "variants": product.get("variants", []),
                "allowPreorder": product.get("allowPreorder", False),
            },
            "shade": {"name": shade["name"], "swatch": shade["swatch"]} if shade else None,
        },
        product=product,
        shade=shade,
        selected=selected,
        sold_out=sold_out,
        stock=catalog.stock_message(product, selected if not sold_out else None, int(settings["commerce"].get("lowStockThreshold", 3))),
        primary_collection=primary_collection,
        views=views,
        related=related,
        info_items=info_items,
    )


# ---------------------------------------------------------------------------
# Content pages
# ---------------------------------------------------------------------------
@router.get("/about", response_class=HTMLResponse)
def about(request: Request):
    page = get_page("about")
    swatch = get_shade_map().get("toffee-riot", {}).get("swatch")
    return render_page(
        request,
        "pages/about.html",
        meta={"title": "About us", "description": page["hero"].get("sub", "")},
        jsonld=[breadcrumb_jsonld([("Home", "/"), ("About", "/about")])],
        about=page,
        story_swatch=swatch,
    )


@router.get("/hair-care", response_class=HTMLResponse)
def hair_care(request: Request):
    page = get_page("hairCare")
    return render_page(
        request,
        "pages/hair_care.html",
        meta={"title": "Hair care guide", "description": page["hero"].get("sub", "")},
        jsonld=[breadcrumb_jsonld([("Home", "/"), ("Hair Care", "/hair-care")])],
        care=page,
    )


@router.get("/faq", response_class=HTMLResponse)
def faq(request: Request):
    page = get_page("faq")
    return render_page(
        request,
        "pages/qa.html",
        meta={"title": "FAQ", "description": page["hero"].get("sub", "")},
        jsonld=[faq_jsonld(page.get("groups", [])), breadcrumb_jsonld([("Home", "/"), ("FAQ", "/faq")])],
        page=page,
        id_prefix="faq",
    )


@router.get("/shipping-returns", response_class=HTMLResponse)
def shipping_returns(request: Request):
    page = get_page("shipping")
    return render_page(
        request,
        "pages/qa.html",
        meta={"title": "Shipping & Returns", "description": page["hero"].get("sub", "")},
        jsonld=[breadcrumb_jsonld([("Home", "/"), ("Shipping & Returns", "/shipping-returns")])],
        page=page,
        id_prefix="ship",
    )


@router.get("/contact", response_class=HTMLResponse)
def contact(request: Request):
    page = get_page("contactPage")
    return render_page(
        request,
        "pages/contact.html",
        meta={"title": "Contact us", "description": page["hero"].get("sub", "")},
        jsonld=[breadcrumb_jsonld([("Home", "/"), ("Contact", "/contact")])],
        page=page,
    )


# ---------------------------------------------------------------------------
# Generated placeholder art, SEO files
# ---------------------------------------------------------------------------
@router.get("/art/{texture}/{colours}/{seed}.svg")
def hair_art(texture: str, colours: str, seed: str):
    """Placeholder hair swatch. The URL fully describes the image → cache forever."""
    parts = colours.split("-")
    svg = hair_art_svg(texture, *parts, seed) if len(parts) == 3 else None
    if not svg:
        return Response(status_code=404)
    return Response(svg, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=31536000, immutable"})


@router.get("/sitemap.xml")
def sitemap():
    return Response(sitemap_xml(get_products(), get_collections()), media_type="application/xml")


@router.get("/robots.txt", response_class=PlainTextResponse)
def robots():
    return robots_txt()
