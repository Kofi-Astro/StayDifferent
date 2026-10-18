"""
Test setup: every test run gets a fresh, empty storage folder so tests never
touch real content. DATA_DIR must be set BEFORE the app is imported.
"""

import os
import tempfile

import pytest

os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="sd-test-")
os.environ.setdefault("ADMIN_PASSWORD", "test-password")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

HOST = "http://testserver"


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def admin(client):
    """A client that is logged in to the admin."""
    response = client.post("/admin/login", data={"password": "test-password"}, follow_redirects=False)
    assert response.status_code == 303 and response.headers["location"] == "/admin"
    client.headers.update({"Origin": HOST})
    return client
