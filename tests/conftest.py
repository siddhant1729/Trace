import pytest


@pytest.fixture(autouse=True)
def set_test_env(monkeypatch):
    """Provides required env vars for all tests so config loads without a real .env."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-for-pytest")
