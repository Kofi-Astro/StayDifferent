"""
Content store — a small JSON "database" on disk
================================================

Files inside ``DATA_DIR`` (default ``./storage``)::

    content.json       sections edited in the admin (settings, products, …)
    submissions.json   newsletter sign-ups, contact messages, order requests
    uploads/           images uploaded in the admin (served at /media/…)
    backups/           automatic snapshots of content.json before each save

How reads work::

    get_section("products")  →  the admin-saved copy if there is one,
                                 otherwise the default from data/products.json

Why a JSON file? One owner edits at a time and the catalogue is small, so a
file is fast, zero-config and trivial to back up. To move to a database or a
headless CMS later, re-implement the functions in this module (and
``app/data.py``) — nothing else needs to change.
"""

from __future__ import annotations

import copy
import json
import os
import threading
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .config import DATA_DIR, SEED_DIR, UPLOAD_DIR

CONTENT_FILE = DATA_DIR / "content.json"
SUBMISSIONS_FILE = DATA_DIR / "submissions.json"
BACKUP_DIR = DATA_DIR / "backups"
MAX_BACKUPS = 30

#: Section key → seed file in /data. Adding a section? Add it here and give it
#: a schema in app/schemas.json — it then appears in the admin automatically.
SEED_FILES = {
    "settings": "settings.json",
    "products": "products.json",
    "shades": "shades.json",
    "collections": "collections.json",
    "colourGuide": "colour-guide.json",
    "home": "home.json",
    "about": "about.json",
    "hairCare": "hair-care.json",
    "faq": "faq.json",
    "shipping": "shipping.json",
    "contactPage": "contact-page.json",
}
SECTION_KEYS = list(SEED_FILES)

SUBMISSION_KINDS = ("newsletter", "contact", "orders")

# One lock serialises every write so two quick admin saves can't interleave.
_lock = threading.RLock()
_content_cache: dict[str, Any] | None = None
_seed_cache: dict[str, Any] = {}


def init_store() -> None:
    """Create the storage folders (called once at start-up)."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def _read_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return fallback
    except (OSError, json.JSONDecodeError) as exc:
        print(f"[store] Could not read {path}: {exc}")
        return fallback


def _write_json_atomic(path: Path, data: Any) -> None:
    """Write to a temp file, then rename over the original.

    A crash mid-write can therefore never leave a half-written (corrupt) file.
    """
    tmp = path.with_suffix(f".{os.getpid()}.tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def _load_content() -> dict[str, Any]:
    global _content_cache
    if _content_cache is None:
        _content_cache = _read_json(CONTENT_FILE, {})
    return _content_cache


def get_default(key: str) -> Any:
    """The untouched default for a section, read from /data (cached)."""
    if key not in _seed_cache:
        _seed_cache[key] = _read_json(SEED_DIR / SEED_FILES[key], {} if key != "products" else [])
    return copy.deepcopy(_seed_cache[key])


def get_section(key: str) -> Any:
    """One content section: the admin-saved copy, or the /data default."""
    content = _load_content()
    if key in content:
        return copy.deepcopy(content[key])
    return get_default(key)


def is_customised(key: str) -> bool:
    """Has the owner saved this section in the admin (vs. still using defaults)?"""
    return key in _load_content()


def _backup() -> None:
    """Copy content.json into backups/ and keep only the newest MAX_BACKUPS."""
    if not CONTENT_FILE.exists():
        return
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%f")
    (BACKUP_DIR / f"content-{stamp}.json").write_bytes(CONTENT_FILE.read_bytes())
    backups = sorted(BACKUP_DIR.glob("content-*.json"))
    for old in backups[: max(0, len(backups) - MAX_BACKUPS)]:
        old.unlink(missing_ok=True)


def set_section(key: str, value: Any) -> None:
    """Save a section (replaces it entirely)."""
    global _content_cache
    if key not in SEED_FILES:
        raise KeyError(f'Unknown section "{key}"')
    with _lock:
        content = dict(_load_content())
        _backup()
        content[key] = copy.deepcopy(value)
        _write_json_atomic(CONTENT_FILE, content)
        _content_cache = content


def reset_section(key: str) -> None:
    """Remove the saved copy so the section falls back to its /data default."""
    global _content_cache
    with _lock:
        content = dict(_load_content())
        if key not in content:
            return
        _backup()
        content.pop(key)
        _write_json_atomic(CONTENT_FILE, content)
        _content_cache = content


def export_all() -> dict[str, Any]:
    """Every section (for the admin's "Download backup" button)."""
    return {key: get_section(key) for key in SECTION_KEYS}


def import_all(data: dict[str, Any]) -> None:
    """Replace all saved content from a backup file. Unknown keys are ignored."""
    global _content_cache
    with _lock:
        _backup()
        content = {k: data[k] for k in SECTION_KEYS if k in data}
        _write_json_atomic(CONTENT_FILE, content)
        _content_cache = content


# ---------------------------------------------------------------------------
# Submissions (newsletter / contact / orders)
# ---------------------------------------------------------------------------


def get_submissions() -> dict[str, list[dict[str, Any]]]:
    saved = _read_json(SUBMISSIONS_FILE, {})
    return {kind: saved.get(kind, []) for kind in SUBMISSION_KINDS}


def add_submission(kind: str, entry: dict[str, Any]) -> dict[str, Any]:
    """Append a submission (newest first). Each gets an id + timestamp."""
    with _lock:
        everything = get_submissions()
        record = {"id": uuid.uuid4().hex, "createdAt": datetime.now(UTC).isoformat(), **entry}
        everything[kind] = [record, *everything[kind]][:5000]  # cap growth
        _write_json_atomic(SUBMISSIONS_FILE, everything)
        return record


def update_submission(kind: str, sub_id: str, patch: dict[str, Any]) -> None:
    """Update fields on a submission (e.g. mark an order as "confirmed")."""
    with _lock:
        everything = get_submissions()
        everything[kind] = [{**s, **patch} if s["id"] == sub_id else s for s in everything[kind]]
        _write_json_atomic(SUBMISSIONS_FILE, everything)


def delete_submission(kind: str, sub_id: str) -> None:
    with _lock:
        everything = get_submissions()
        everything[kind] = [s for s in everything[kind] if s["id"] != sub_id]
        _write_json_atomic(SUBMISSIONS_FILE, everything)
