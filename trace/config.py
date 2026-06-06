from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Required
    gemini_api_key: str = ""

    # Optional with defaults
    gemini_model: str = "gemini-flash-latest"
    port: int = 8000
    allowed_origins: str = "http://localhost:3000"
    chroma_path: str = "./chroma_db"


settings = Settings()
