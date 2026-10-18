"""
Site configuration
==================

Environment-driven settings (paths, URLs, secrets) and the fixed navigation.

Everything a shop owner would want to change — brand name, contact details,
currencies, shipping copy… — lives in ``data/settings.json`` and is editable in
the admin panel (Admin → Settings). Search the project for ``TODO:`` to find
every placeholder that needs real business details before launch.
"""

from __future__ import annotations

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT_DIR = Path(__file__).resolve().parent.parent
SEED_DIR = ROOT_DIR / "data"  # default content shipped with the code
STATIC_DIR = ROOT_DIR / "public"  # CSS, browser JS, fonts, admin UI
TEMPLATE_DIR = ROOT_DIR / "templates"  # Jinja2 HTML templates

# Where admin edits, uploads and form submissions are written.
# On Railway, mount a volume and point DATA_DIR at it (see README).
DATA_DIR = Path(os.environ.get("DATA_DIR", ROOT_DIR / "storage")).resolve()
UPLOAD_DIR = DATA_DIR / "uploads"

# ---------------------------------------------------------------------------
# URLs & environment
# ---------------------------------------------------------------------------
#: Public URL of the site — used for canonical links, the sitemap and OG tags.
SITE_URL = os.environ.get("SITE_URL", "http://localhost:8000").rstrip("/")

IS_PRODUCTION = os.environ.get("ENV", os.environ.get("RAILWAY_ENVIRONMENT", "")).lower() in {"production", "prod"}

#: Appended to CSS/JS URLs (?v=…) so browsers fetch fresh files after a deploy.
ASSET_VERSION = (os.environ.get("RAILWAY_GIT_COMMIT_SHA") or os.urandom(4).hex())[:10]

# ---------------------------------------------------------------------------
# Admin authentication
# ---------------------------------------------------------------------------
#: Password for /admin. Required in production; defaults to "admin" locally.
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD") or ("" if IS_PRODUCTION else "admin")
#: Secret that signs the admin session cookie.
ADMIN_SECRET = os.environ.get("ADMIN_SECRET") or f"sd-session::{ADMIN_PASSWORD}"
SESSION_HOURS = 12

# ---------------------------------------------------------------------------
# Navigation (structure only — labels/links rarely change)
# ---------------------------------------------------------------------------
MAIN_NAV = [
    {"label": "Home", "href": "/"},
    {"label": "Shop", "href": "/shop", "mega": True},  # gets the mega-menu
    {"label": "Colour Guide", "href": "/colour-guide"},
    {"label": "Hair Care", "href": "/hair-care"},
    {"label": "About", "href": "/about"},
    {"label": "Contact", "href": "/contact"},
]

FOOTER_NAV = {
    "support": [
        {"label": "Contact us", "href": "/contact"},
        {"label": "FAQ", "href": "/faq"},
        {"label": "Shipping & Returns", "href": "/shipping-returns"},
        {"label": "Hair Care", "href": "/hair-care"},
    ],
    "explore": [
        {"label": "Shop all", "href": "/shop"},
        {"label": "Colour Guide", "href": "/colour-guide"},
        {"label": "About us", "href": "/about"},
        {"label": "Wigs", "href": "/shop/wigs"},
    ],
}
