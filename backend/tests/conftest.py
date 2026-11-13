"""Shared test setup: keep tests offline and independent of a developer's machine."""
import pytest

from backend.app.engine import unsplash_service


@pytest.fixture(autouse=True)
def isolated_backend(monkeypatch):
    # Tests add their own reference rows; do not preload the sample catalog.
    monkeypatch.setenv('RECLAIM_AUTO_SEED', '0')
    # Never use a real key from a local .env file, and never reach the real Unsplash.
    monkeypatch.delenv('UNSPLASH_ACCESS_KEY', raising=False)
    unsplash_service.reset_cache()
    yield
    unsplash_service.reset_cache()
