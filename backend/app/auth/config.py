from datetime import timedelta
import os
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

class AuthConfig(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))
    ALGORITHM: str = os.getenv("JWT_ALGORITHM")
    TOKEN_URL: str = os.getenv("TOKEN_URL")
    
    # Rate limiting settings
    REDIS_URL: str = os.getenv("REDIS_URL")
    LOGIN_RATE_LIMIT: int = int(os.getenv("LOGIN_RATE_LIMIT"))
    LOGIN_RATE_LIMIT_PERIOD: int = int(os.getenv("LOGIN_RATE_LIMIT_PERIOD"))
    
    # Application URLs
    BASE_URL: str = os.getenv("BASE_URL")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"  # Ignore extra fields from .env
    )

auth_config = AuthConfig()

# OAuth2 configuration
oauth2_scheme = {
    "tokenUrl": auth_config.TOKEN_URL,
    "scheme_name": "Bearer"
}

# Token settings
ACCESS_TOKEN_EXPIRE = timedelta(minutes=auth_config.ACCESS_TOKEN_EXPIRE_MINUTES)
REFRESH_TOKEN_EXPIRE = timedelta(days=auth_config.REFRESH_TOKEN_EXPIRE_DAYS) 