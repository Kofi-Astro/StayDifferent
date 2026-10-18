"""
Admin content schemas — validation
==================================

``app/schemas.json`` describes every editable field of every section. It is
used twice:

1. The admin UI (public/admin/js/form.js) builds its forms from it — so adding
   a field to the JSON adds it to the admin.
2. This module runs ``prepare_section()`` on every save, so only known fields
   with the right types are ever stored, and required fields/slugs are checked.

Field types: text · textarea · heading · number · toggle · select ·
multiselect · color · image · images · list · group · repeater · hidden
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from typing import Any

from .config import ROOT_DIR

MAX_TEXT = 20_000


@lru_cache(maxsize=1)
def load_schemas() -> dict[str, Any]:
    return json.loads((ROOT_DIR / "app" / "schemas.json").read_text(encoding="utf-8"))


def section_schema(key: str) -> dict[str, Any] | None:
    return next((s for s in load_schemas()["sections"] if s["key"] == key), None)


def _clean_field(field: dict[str, Any], value: Any) -> Any:
    """Coerce one value to its field type."""
    kind = field["type"]
    if kind in {"text", "heading", "textarea", "hidden", "select", "image"}:
        return "" if value is None else str(value)[:MAX_TEXT].strip()
    if kind == "color":
        return str(value) if re.fullmatch(r"#[0-9a-fA-F]{6}", str(value or "")) else "#000000"
    if kind == "number":
        if value in ("", None) and field.get("nullable"):
            return None
        try:
            number = float(value)
        except (TypeError, ValueError):
            return None if field.get("nullable") else 0
        number = max(field.get("min", float("-inf")), number)
        return int(number) if number.is_integer() else number
    if kind == "toggle":
        return value is True or value in ("true", "on", "1", 1)
    if kind in {"multiselect", "list", "images"}:
        return [str(v)[:MAX_TEXT].strip() for v in value if str(v).strip()] if isinstance(value, list) else []
    if kind == "group":
        return sanitize(field["fields"], value if isinstance(value, dict) else {})
    if kind == "repeater":
        return (
            [sanitize(field["fields"], item if isinstance(item, dict) else {}) for item in value[:500]] if isinstance(value, list) else []
        )
    return None


def sanitize(fields: list[dict[str, Any]], value: dict[str, Any]) -> dict[str, Any]:
    """Keep only the described fields, coerced to the right types."""
    return {f["key"]: _clean_field(f, (value or {}).get(f["key"])) for f in fields}


def validate(fields: list[dict[str, Any]], value: dict[str, Any], path: str = "") -> list[str]:
    """Human-readable problems with required fields and patterns (empty = valid)."""
    errors: list[str] = []
    for field in fields:
        v = (value or {}).get(field["key"])
        label = f"{path} → {field.get('label', field['key'])}" if path else field.get("label", field["key"])
        if field.get("required") and v in ("", None):
            errors.append(f"{label} is required.")
        if field.get("pattern") and v and not re.fullmatch(field["pattern"].strip("^$"), str(v)):
            errors.append(f"{label} is not valid. {field.get('help', '')}".strip())
        if field["type"] == "group":
            errors += validate(field["fields"], v or {}, label)
        if field["type"] == "repeater" and isinstance(v, list):
            for i, item in enumerate(v):
                errors += validate(field["fields"], item, f"{label} #{i + 1}")
    return errors


def prepare_section(key: str, value: Any) -> tuple[Any, list[str]]:
    """Sanitise + validate a whole section. Returns (clean value, errors)."""
    schema = section_schema(key)
    if schema is None:
        return None, [f'Unknown section "{key}".']
    fields = schema["fields"]
    if schema["kind"] == "collection":
        items = [sanitize(fields, item) for item in (value if isinstance(value, list) else []) if isinstance(item, dict)]
        errors: list[str] = []
        for i, item in enumerate(items):
            errors += validate(fields, item, item.get(schema["titleKey"]) or f"Item {i + 1}")
        # IDs and slugs must be unique or links would collide.
        for unique_key in {schema["idKey"], "slug"}:
            seen: set[str] = set()
            for item in items:
                v = item.get(unique_key)
                if v and v in seen:
                    errors.append(f'Two items share the {unique_key} "{v}" — each must be unique.')
                seen.add(v)
        return items, errors
    clean = sanitize(fields, value if isinstance(value, dict) else {})
    return clean, validate(fields, clean)
