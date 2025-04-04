from datetime import timedelta
import os
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

class AuthConfig(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-jwt")  # Change in production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    ALGORITHM: str = "HS256"
    TOKEN_URL: str = "/api/v1/auth/token"
    
    # Rate limiting settings
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    LOGIN_RATE_LIMIT: int = int(os.getenv("LOGIN_RATE_LIMIT", "5"))  # 5 attempts
    LOGIN_RATE_LIMIT_PERIOD: int = int(os.getenv("LOGIN_RATE_LIMIT_PERIOD", "300"))  # 5 minutes
    
    # Application URLs
    BASE_URL: str = os.getenv("BASE_URL", "http://localhost:5174")  # Frontend URL for magic links

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