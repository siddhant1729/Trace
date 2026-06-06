# Backward-compatibility shim — app logic lives in trace/api/main.py
from trace.api.main import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    from trace.config import settings
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
