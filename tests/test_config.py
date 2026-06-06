from trace.config import Settings


def test_settings_load():
    s = Settings()
    assert s.gemini_api_key == "test-key-for-pytest"
    assert s.gemini_model == "gemini-flash-latest"
    assert s.port == 8000
    assert s.chroma_path == "./chroma_db"
    assert s.allowed_origins == "http://localhost:3000"


def test_settings_env_override(monkeypatch):
    monkeypatch.setenv("GEMINI_MODEL", "gemini-pro")
    monkeypatch.setenv("PORT", "9000")
    s = Settings()
    assert s.gemini_model == "gemini-pro"
    assert s.port == 9000
