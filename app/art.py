"""
Generated artwork: placeholder "hair swatches" and the inline SVG icon set
=========================================================================

TODO: replace with brand photography.

Until real photos are uploaded in the admin, every product, collection and
hero shows a generated SVG: a gradient in the shade's colours with flowing
strands drawn in the product's texture (straight, body wave, curly, kinky).

The SVG is served as an image from ``/art/<texture>/<base>-<mid>-<highlight>/<seed>.svg``
(see ``app/routes/site.py``). The URL fully describes the picture, so it is
cached by the browser "forever", and the browser-side cart/search can build
the same URLs (``public/js/shared/art.js``) without duplicating this code.
"""

from __future__ import annotations

import re
from functools import lru_cache
from html import escape

from markupsafe import Markup

DEFAULT_SWATCH = {"base": "#3a2b22", "mid": "#5d4636", "highlight": "#a07c5c"}

#: Wave settings per texture: amplitude (px), half-wavelength (px), strand count.
WAVES = {
    "straight": (5, 260, 44),
    "body-wave": (18, 80, 40),
    "curly": (12, 26, 30),
    "kinky-curly": (8, 13, 30),
}
VARIANTS = 6  # distinct strand shapes; neighbouring strands share similar phases

_HEX = re.compile(r"^[0-9a-fA-F]{6}$")


def art_url(swatch: dict | None, texture: str = "straight", seed: str = "x") -> str:
    """URL of the placeholder art for a shade swatch + texture."""
    s = swatch or DEFAULT_SWATCH
    colours = "-".join(str(s.get(k, DEFAULT_SWATCH[k])).lstrip("#") for k in ("base", "mid", "highlight"))
    safe_seed = re.sub(r"[^a-z0-9-]", "", str(seed).lower())[:60] or "x"
    texture = texture if texture in WAVES else "straight"
    return f"/art/{texture}/{colours}/{safe_seed}.svg"


def _hash(text: str) -> int:
    """Small deterministic hash (FNV-1a) — same input, same artwork."""
    h = 2166136261
    for ch in text.encode():
        h ^= ch
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _rng(seed: int):
    """Seeded pseudo-random generator (mulberry32)."""
    state = seed & 0xFFFFFFFF

    def next_float() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return next_float


def _strand_path(amp: float, half: float, phase: float) -> str:
    """One vertical wavy strand: a chain of cubic curves approximating a sine wave."""
    y = -40 - phase
    d = [f"M0 {y:.0f}"]
    direction = 1
    while y < 560:
        k = amp * 1.33 * direction
        d.append(f"c{k:.0f} {half * 0.33:.0f} {k:.0f} {half * 0.67:.0f} 0 {half:.0f}")
        y += half
        direction *= -1
    return "".join(d)


@lru_cache(maxsize=512)
def hair_art_svg(texture: str, base: str, mid: str, highlight: str, seed: str) -> str | None:
    """Build the SVG document. Returns None for invalid colours."""
    if not all(_HEX.match(c) for c in (base, mid, highlight)):
        return None
    amp, half, count = WAVES.get(texture, WAVES["straight"])
    rand = _rng(_hash(f"{seed}|{texture}|{base}{mid}{highlight}"))
    variants = [_strand_path(amp, half, i * half * 0.16) for i in range(VARIANTS)]

    strands = []
    for i in range(count):
        x = round(-20 + (440 / count) * i + rand() * 8)
        variant = min(VARIANTS - 1, int((i / count) * VARIANTS + rand() * 1.4))
        colour = highlight if rand() > 0.4 else mid
        width = 0.8 + rand() * 2.6
        opacity = 0.2 + rand() * 0.45
        strands.append(f'<use href="#p{variant}" x="{x}" stroke="#{colour}" stroke-width="{width:.1f}" opacity="{opacity:.2f}"/>')

    paths = "".join(f'<path id="p{i}" d="{d}" fill="none" stroke-linecap="round"/>' for i, d in enumerate(variants))
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        'viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" width="400" height="500">'
        "<defs>"
        f'<linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#{base}"/>'
        f'<stop offset="0.55" stop-color="#{mid}"/><stop offset="1" stop-color="#{highlight}"/></linearGradient>'
        '<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0.25" stop-color="#fff" stop-opacity="0"/>'
        '<stop offset="0.5" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.75" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        f"{paths}</defs>"
        '<rect width="400" height="500" fill="url(#bg)"/>'
        f"<g>{''.join(strands)}</g>"
        '<rect width="400" height="500" fill="url(#sheen)"/>'
        "</svg>"
    )


# ---------------------------------------------------------------------------
# Icons — inline SVG (24×24 grid, currentColor). Decorative: pair them with
# visible text or an aria-label/sr-only label on the parent.
# ---------------------------------------------------------------------------
ICONS = {
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    "bag": '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    "menu": '<path d="M4 7h16M4 12h16M4 17h10"/>',
    "close": '<path d="M6 6l12 12M18 6 6 18"/>',
    "arrow": '<path d="M4 12h15M13 6l6 6-6 6"/>',
    "chevron": '<path d="m6 9 6 6 6-6"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "minus": '<path d="M5 12h14"/>',
    "check": '<path d="m5 12 5 5L20 7"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/>',
    "phone": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z"/>',
    "whatsapp": '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19l-4 1Z"/><path d="M9 9.5c.3 1.8 1.7 3.6 3.6 4.4l1.2-1.1 1.7.8c-.2 1-1 1.6-2 1.6A6 6 0 0 1 8 9.7c0-1 .6-1.8 1.6-2l.8 1.7-1.4 1.1"/>',
    "instagram": '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>',
    "tiktok": '<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.4 2.5 2.2 4.2 5 4.5"/>',
    "youtube": '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="m10.5 9.5 4 2.5-4 2.5v-5Z"/>',
    "facebook": '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z"/>',
    "drop": '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
    "comb": '<path d="M4 9h16v3H4z"/><path d="M6 12v6M9 12v6M12 12v6M15 12v6M18 12v6"/>',
    "flame": '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.5 1 2.5 2 3 0-3 .5-5.5.5-8Z"/>',
    "box": '<path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/>',
    "clock": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    "sparkle": '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    "truck": '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    "shield": '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    "palette": '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15 15h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    "return": '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    "globe": '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5Z"/>',
}


def icon(name: str, class_name: str = "") -> Markup:
    """Inline SVG icon for templates: ``{{ icon('arrow', 'icon--sm') }}``."""
    return Markup(
        f'<svg class="icon {escape(class_name)}" viewBox="0 0 24 24" width="24" height="24" fill="none" '
        'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" '
        f'aria-hidden="true" focusable="false">{ICONS.get(name, "")}</svg>'
    )
