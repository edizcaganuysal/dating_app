import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to project root (parent of backend/)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://yuni:yuni@localhost:5433/yuni_dev"
    DATABASE_TEST_URL: str = "postgresql+asyncpg://yuni:yuni@localhost:5433/yuni_test"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    OPENAI_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=str(_ENV_FILE))


settings = Settings()
