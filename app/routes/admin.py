"""
Admin panel routes
==================

Pages
    GET  /admin/login          login form
    POST /admin/login          check password → set session cookie
    POST /admin/logout
    GET  /admin/forgot         "Forgot password?" — emails a one-time reset link
    POST /admin/forgot
    GET  /admin/reset?token=   choose a new password from the emailed link
    POST /admin/reset
    GET  /admin                the admin app (a single page; its JavaScript
                               lives in public/admin/js/)

JSON API (all require a valid session)
    GET    /admin/api/bootstrap               schemas + every section + inbox counts
    PUT    /admin/api/sections/{key}          save a section (validated)
    DELETE /admin/api/sections/{key}          reset a section to its /data default
    POST   /admin/api/upload                  upload an image (raw body)
    GET    /admin/api/media                   list uploaded images
    DELETE /admin/api/media/{name}            delete an uploaded image
    GET    /admin/api/submissions             orders, messages, subscribers
    PATCH  /admin/api/submissions/{kind}/{id} update (e.g. order status)
    DELETE /admin/api/submissions/{kind}/{id}
    GET    /admin/api/export                  download a full content backup
    POST   /admin/api/import                  restore a backup
    GET    /admin/api/account                 password / email-reset status
    POST   /admin/api/password                change the admin password
"""

from __future__ import annotations

import re
import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from .. import auth, mailer, store
from ..config import ASSET_VERSION, SITE_URL, UPLOAD_DIR
from ..ratelimit import rate_limit
from ..render import env
from ..schemas import load_schemas, prepare_section

router = APIRouter(prefix="/admin")
api = APIRouter(prefix="/admin/api", dependencies=[Depends(auth.require_admin)])

NO_STORE = {"Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif"}


def _page(template: str, **context) -> HTMLResponse:
    return HTMLResponse(env.get_template(template).render(**context), headers=NO_STORE)


# ---------------------------------------------------------------------------
# Login / logout / app shell
# ---------------------------------------------------------------------------
@router.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    if auth.is_logged_in(request):
        return RedirectResponse("/admin", status_code=303)
    return _page("admin/login.html", enabled=auth.admin_enabled(), error=request.query_params.get("error"))


@router.post("/login", dependencies=[rate_limit("login", 10)])
async def login(request: Request):
    form = await request.form()
    if not auth.check_password(str(form.get("password", ""))):
        return RedirectResponse("/admin/login?error=1", status_code=303)
    response = RedirectResponse("/admin", status_code=303)
    response.set_cookie(value=auth.make_session(), **auth.cookie_options())
    return response


@router.post("/logout")
def logout():
    response = RedirectResponse("/admin/login", status_code=303)
    response.delete_cookie(auth.COOKIE_NAME, path="/admin")
    return response


@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse, include_in_schema=False)
def admin_app(request: Request):
    if not auth.is_logged_in(request):
        return RedirectResponse("/admin/login", status_code=303)
    return _page("admin/index.html", v=ASSET_VERSION)


# ---------------------------------------------------------------------------
# Forgot / reset password
# ---------------------------------------------------------------------------
@router.get("/forgot", response_class=HTMLResponse)
def forgot_form():
    return _page("admin/forgot.html", email_ready=mailer.email_configured(), sent=False)


@router.post("/forgot", dependencies=[rate_limit("forgot", 5)])
def forgot_send():
    """Email a reset link to ADMIN_EMAIL. The page always shows the same
    message, so it can't be used to probe whether email is set up."""
    if mailer.email_configured():
        link = f"{SITE_URL}/admin/reset?token={auth.make_reset_token()}"
        body = (
            "Someone (hopefully you) asked to reset the Stay Different admin password.\n\n"
            f"Choose a new password here (the link works once, for {auth.RESET_LINK_MINUTES} minutes):\n{link}\n\n"
            "If this wasn't you, ignore this email — your password stays the same."
        )
        try:
            mailer.send_email(mailer.ADMIN_EMAIL, "Reset your Stay Different admin password", body)
        except Exception as exc:  # noqa: BLE001 — never show SMTP errors to visitors
            print(f"[admin] Could not send reset email: {exc}")
    return _page("admin/forgot.html", email_ready=mailer.email_configured(), sent=True)


@router.get("/reset", response_class=HTMLResponse)
def reset_form(request: Request):
    token = request.query_params.get("token", "")
    return _page("admin/reset.html", token=token, valid=auth.check_reset_token(token), error=None, min_length=auth.MIN_PASSWORD_LENGTH)


@router.post("/reset", dependencies=[rate_limit("reset", 10)])
async def reset_password(request: Request):
    form = await request.form()
    token = str(form.get("token", ""))
    password, confirm = str(form.get("password", "")), str(form.get("confirm", ""))
    if not auth.check_reset_token(token):
        return _page("admin/reset.html", token=token, valid=False, error=None, min_length=auth.MIN_PASSWORD_LENGTH)
    error = None
    if password != confirm:
        error = "The two passwords don't match."
    else:
        try:
            auth.set_password(password)
        except ValueError as exc:
            error = str(exc)
    if error:
        return _page("admin/reset.html", token=token, valid=True, error=error, min_length=auth.MIN_PASSWORD_LENGTH)
    # Sign straight in with the new password.
    response = RedirectResponse("/admin", status_code=303)
    response.set_cookie(value=auth.make_session(), **auth.cookie_options())
    return response


# ---------------------------------------------------------------------------
# Content sections
# ---------------------------------------------------------------------------
@api.get("/bootstrap")
def bootstrap():
    """Everything the admin app needs on load."""
    submissions = store.get_submissions()
    return JSONResponse(
        {
            "schemas": load_schemas()["sections"],
            "sections": store.export_all(),
            "customised": {k: store.is_customised(k) for k in store.SECTION_KEYS},
            "counts": {
                "ordersPending": sum(1 for o in submissions["orders"] if o.get("status") == "pending"),
                "messages": len(submissions["contact"]),
                "subscribers": len(submissions["newsletter"]),
            },
        },
        headers=NO_STORE,
    )


@api.put("/sections/{key}")
async def save_section(key: str, request: Request):
    if key not in store.SECTION_KEYS:
        raise HTTPException(404, "Unknown section.")
    value, errors = prepare_section(key, await request.json())
    if errors:
        return JSONResponse({"error": "Please fix the highlighted problems.", "errors": errors[:20]}, status_code=400)
    store.set_section(key, value)
    return {"ok": True, "value": value}


@api.delete("/sections/{key}")
def reset_section(key: str):
    if key not in store.SECTION_KEYS:
        raise HTTPException(404, "Unknown section.")
    store.reset_section(key)
    return {"ok": True, "value": store.get_section(key)}


# ---------------------------------------------------------------------------
# Media (image uploads)
# ---------------------------------------------------------------------------
@api.post("/upload")
async def upload(request: Request):
    """Upload one image. The browser sends the file as the raw request body
    with its Content-Type (no multipart parsing needed)."""
    content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
    ext = IMAGE_TYPES.get(content_type)
    if not ext:
        raise HTTPException(415, "Please upload a JPG, PNG, WebP, AVIF or GIF image.")
    body = await request.body()
    if not body:
        raise HTTPException(400, "The file is empty.")
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Images must be 8 MB or smaller.")
    original = re.sub(r"[^a-z0-9-]+", "-", request.headers.get("x-filename", "image").lower().rsplit(".", 1)[0]).strip("-")[:40]
    name = f"{original or 'image'}-{secrets.token_hex(4)}.{ext}"  # random suffix → safe to cache forever
    (UPLOAD_DIR / name).write_bytes(body)
    return {"ok": True, "url": f"/media/{name}", "name": name}


@api.get("/media")
def list_media():
    files = sorted((p for p in UPLOAD_DIR.iterdir() if p.is_file()), key=lambda p: p.stat().st_mtime, reverse=True)
    return [
        {
            "name": p.name,
            "url": f"/media/{p.name}",
            "size": p.stat().st_size,
            "uploadedAt": datetime.fromtimestamp(p.stat().st_mtime, UTC).isoformat(),
        }
        for p in files
    ]


@api.delete("/media/{name}")
def delete_media(name: str):
    path = (UPLOAD_DIR / name).resolve()
    # Never allow deleting anything outside the uploads folder.
    if path.parent != UPLOAD_DIR.resolve() or not path.is_file():
        raise HTTPException(404, "File not found.")
    path.unlink()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Inbox (orders, contact messages, newsletter subscribers)
# ---------------------------------------------------------------------------
@api.get("/submissions")
def submissions():
    return JSONResponse(store.get_submissions(), headers=NO_STORE)


ORDER_STATUSES = {"pending", "confirmed", "shipped", "completed", "cancelled"}


@api.patch("/submissions/{kind}/{sub_id}")
async def update_submission(kind: str, sub_id: str, request: Request):
    if kind not in store.SUBMISSION_KINDS:
        raise HTTPException(404, "Unknown inbox.")
    data = await request.json()
    patch = {}
    if "status" in data and data["status"] in ORDER_STATUSES:
        patch["status"] = data["status"]
    if "read" in data:
        patch["read"] = bool(data["read"])
    store.update_submission(kind, sub_id, patch)
    return {"ok": True}


@api.delete("/submissions/{kind}/{sub_id}")
def delete_submission(kind: str, sub_id: str):
    if kind not in store.SUBMISSION_KINDS:
        raise HTTPException(404, "Unknown inbox.")
    store.delete_submission(kind, sub_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------
@api.get("/export")
def export_backup():
    stamp = datetime.now().strftime("%Y-%m-%d")
    return JSONResponse(
        store.export_all(),
        headers={**NO_STORE, "Content-Disposition": f'attachment; filename="stay-different-backup-{stamp}.json"'},
    )


@api.post("/import")
async def import_backup(request: Request):
    data = await request.json()
    if not isinstance(data, dict):
        raise HTTPException(400, "That file doesn't look like a Stay Different backup.")
    cleaned, problems = {}, []
    for key in store.SECTION_KEYS:
        if key in data:
            value, errors = prepare_section(key, data[key])
            problems += [f"{key}: {e}" for e in errors]
            cleaned[key] = value
    if not cleaned:
        raise HTTPException(400, "That file doesn't contain any Stay Different content.")
    if problems:
        return JSONResponse({"error": "The backup has problems.", "errors": problems[:20]}, status_code=400)
    store.import_all(cleaned)
    return {"ok": True, "sections": list(cleaned)}


# ---------------------------------------------------------------------------
# Account (change password)
# ---------------------------------------------------------------------------
@api.get("/account")
def account():
    return {"emailReset": mailer.email_configured(), "adminEmail": mailer.ADMIN_EMAIL, "minLength": auth.MIN_PASSWORD_LENGTH}


@api.post("/password", dependencies=[rate_limit("change-password", 10)])
async def change_password(request: Request):
    data = await request.json()
    if not auth.check_password(str(data.get("current", ""))):
        raise HTTPException(400, "Your current password isn't right.")
    if data.get("new") != data.get("confirm"):
        raise HTTPException(400, "The two new passwords don't match.")
    try:
        auth.set_password(str(data.get("new", "")))
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    # The old session is now invalid (other devices are signed out); issue a fresh one here.
    response = JSONResponse({"ok": True})
    response.set_cookie(value=auth.make_session(), **auth.cookie_options())
    return response
