import pytest
from fastapi.testclient import TestClient

from backend.app.core.config import get_settings
from backend.app.main import create_app


@pytest.fixture(autouse=True)
def clear_settings_cache(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.delenv("CONFIG_FILE", raising=False)
    yield
    get_settings.cache_clear()


def test_production_hides_api_docs(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("EXPOSE_API_DOCS", "false")
    monkeypatch.setenv("ALLOWED_HOSTS", "testserver")
    client = TestClient(create_app())

    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_trusted_host_blocks_unlisted_hosts(monkeypatch):
    monkeypatch.setenv("ALLOWED_HOSTS", "www.tengda.wang")
    client = TestClient(create_app())

    response = client.get("/api/health", headers={"host": "evil.example"})

    assert response.status_code == 400


def test_security_headers_are_present(monkeypatch):
    monkeypatch.setenv("ALLOWED_HOSTS", "testserver")
    client = TestClient(create_app())

    response = client.get("/api/health")

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
