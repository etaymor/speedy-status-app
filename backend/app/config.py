from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database and Redis
    database_url: str
    redis_url: str

    # Application
    secret_key: str
    environment: str
    base_url: str

    # Authentication
    access_token_expire_minutes: int
    refresh_token_expire_days: int
    jwt_algorithm: str
    token_url: str

    # Rate Limiting
    login_rate_limit: int
    login_rate_limit_period: int

    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4o"  # Default to GPT-4, can be overridden in .env
    openai_max_retries: int = 3
    openai_retry_delay: int = 1  # Base delay in seconds for exponential backoff

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings() 