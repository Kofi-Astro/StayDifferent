"""
Stay Different Hair — web server (FastAPI)
==========================================

Run locally:
    .venv/bin/uvicorn app.main:app --reload        → http://localhost:8000
    Admin panel:                                    → http://localhost:8000/admin

What this app does:
  1. Renders storefront pages from Jinja2 HTML templates (templates/) with
     fresh content from the store, so pages arrive complete (SEO + speed).
  2. Serves static files from public/ (CSS, browser JS, fonts, admin UI).
  3. Serves admin-uploaded images from DATA_DIR/uploads at /media/….
  4. Exposes JSON APIs for forms, search, checkout and the admin panel.
"""

from __future__ import annotations

from datetime import date

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from starlette.responses import Response

from .config import STATIC_DIR, UPLOAD_DIR
from .render import env
from .routes import admin, api, site
from .store import init_store

init_store()
env.globals["year"] = date.today().year

app = FastAPI(title="Stay Different Hair", docs_url=None, redoc_url=None, openapi_url=None)

# Compress HTML, CSS, JS and JSON responses.
app.add_middleware(GZipMiddleware, minimum_size=800)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Sensible security headers on every response."""
    response: Response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response


class CachedStatic(StaticFiles):
    """Static files with cache headers.

    - Fonts & images: 30 days.
    - CSS/JS requested with ?v=… (see asset() in app/render.py): 1 year — the
      version changes on every deploy, so browsers fetch the new file.
    - CSS/JS without ?v (modules imported by other modules): revalidated each
      visit with an ETag (fast 304s), so a deploy is never served stale.
    - Uploaded media: 1 year (file names are unique).
    """

    def __init__(self, *args, immutable: bool = False, **kwargs):
        super().__init__(*args, **kwargs)
        self.immutable = immutable

    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            if self.immutable:
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            elif path.endswith((".woff2", ".png", ".jpg", ".svg", ".webp", ".ico")):
                response.headers["Cache-Control"] = "public, max-age=2592000"
            elif b"v=" in scope.get("query_string", b""):
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            else:
                response.headers["Cache-Control"] = "no-cache"
        return response


# Routers first, then static files at "/" as the fallback.
app.include_router(api.router)
app.include_router(admin.router)
app.include_router(admin.api)
app.include_router(site.router)
app.mount("/media", CachedStatic(directory=UPLOAD_DIR, immutable=True), name="media")
app.mount("/", CachedStatic(directory=STATIC_DIR), name="static")


# ---------------------------------------------------------------------------
# Errors: JSON for APIs, the branded 404 page for everything else.
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, exc: HTTPException):
    if exc.status_code == 404 and not request.url.path.startswith(("/api/", "/admin/api/")):
        return site.not_found(request)
    return JSONResponse({"error": exc.detail}, status_code=exc.status_code, headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse({"error": "Invalid request."}, status_code=422)
