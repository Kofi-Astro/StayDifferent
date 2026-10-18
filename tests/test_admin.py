"""Admin authentication, content editing and safety checks."""

from app import store


def test_admin_requires_login(client):
    assert client.get("/admin", follow_redirects=False).status_code == 303
    assert client.get("/admin/api/bootstrap").status_code == 401


def test_wrong_password(client):
    res = client.post("/admin/login", data={"password": "nope"}, follow_redirects=False)
    assert res.headers["location"] == "/admin/login?error=1"


def test_bootstrap(admin):
    data = admin.get("/admin/api/bootstrap").json()
    assert {s["key"] for s in data["schemas"]} == set(store.SECTION_KEYS)
    assert len(data["sections"]["products"]) == 17


def test_edit_product_updates_storefront(admin):
    products = admin.get("/admin/api/bootstrap").json()["sections"]["products"]
    products[0]["name"] = "Renamed <script>alert(1)</script> Bundle"
    products[0]["unknownField"] = "should be dropped"
    res = admin.put("/admin/api/sections/products", json=products)
    assert res.status_code == 200
    assert "unknownField" not in res.json()["value"][0]

    # The storefront shows it — escaped, never executed.
    html = admin.get(f"/products/{products[0]['slug']}").text
    assert "Renamed &lt;script&gt;" in html and "<script>alert(1)" not in html

    # Reset brings the original back.
    admin.delete("/admin/api/sections/products")
    assert "Renamed" not in admin.get(f"/products/{products[0]['slug']}").text


def test_validation_errors(admin):
    products = admin.get("/admin/api/bootstrap").json()["sections"]["products"]
    products.append({**products[0], "id": "dup"})  # duplicate slug
    res = admin.put("/admin/api/sections/products", json=products)
    assert res.status_code == 400 and any("unique" in e for e in res.json()["errors"])

    products = products[:-1]
    products[0]["slug"] = "Not A Valid Slug"
    assert admin.put("/admin/api/sections/products", json=products).status_code == 400


def test_settings_change(admin):
    settings = admin.get("/admin/api/bootstrap").json()["sections"]["settings"]
    settings["brand"]["tagline"] = "Stay bold."
    assert admin.put("/admin/api/sections/settings", json=settings).status_code == 200
    assert "Stay bold." in admin.get("/").text
    admin.delete("/admin/api/sections/settings")


def test_cross_site_requests_blocked(admin):
    admin.headers.update({"Origin": "https://evil.example"})
    assert admin.delete("/admin/api/sections/home").status_code == 403


def test_upload_rules(admin):
    bad = admin.post("/admin/api/upload", content=b"hello", headers={"Content-Type": "text/plain"})
    assert bad.status_code == 415
    ok = admin.post("/admin/api/upload", content=b"\x89PNG fake", headers={"Content-Type": "image/png", "X-Filename": "My Photo.png"})
    assert ok.status_code == 200
    name = ok.json()["name"]
    assert name.startswith("my-photo-") and admin.get(ok.json()["url"]).status_code == 200
    # Path traversal is refused and nothing outside uploads/ is touched
    store.set_section("home", store.get_section("home"))  # make sure content.json exists
    assert admin.delete("/admin/api/media/..%2Fcontent.json").status_code >= 400
    assert admin.delete("/admin/api/media/%2E%2E").status_code >= 400
    assert store.CONTENT_FILE.exists()
    assert admin.delete(f"/admin/api/media/{name}").status_code == 200


def test_order_status(admin, client):
    client.post("/api/checkout", json={"items": [{"productId": "p005", "length": 18, "qty": 1}]})
    orders = admin.get("/admin/api/submissions").json()["orders"]
    order_id = orders[0]["id"]
    assert admin.patch(f"/admin/api/submissions/orders/{order_id}", json={"status": "confirmed"}).status_code == 200
    assert admin.get("/admin/api/submissions").json()["orders"][0]["status"] == "confirmed"


def test_backup_roundtrip(admin):
    backup = admin.get("/admin/api/export").json()
    assert admin.post("/admin/api/import", json=backup).status_code == 200
