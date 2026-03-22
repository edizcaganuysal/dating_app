from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://lovegenie:lovegenie@localhost:5433/lovegenie_dev"
    DATABASE_TEST_URL: str = "postgresql+asyncpg://lovegenie:lovegenie@localhost:5433/lovegenie_test"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    OPENAI_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
