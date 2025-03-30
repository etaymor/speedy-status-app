from fastapi import HTTPException, Request, status
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
import redis.asyncio as redis
from .config import auth_config

async def setup_rate_limiter():
    """Initialize the rate limiter with Redis backend"""
    redis_instance = redis.from_url(
        auth_config.REDIS_URL,
        encoding="utf-8",
        decode_responses=True
    )
    await FastAPILimiter.init(redis_instance)

# Rate limit decorator for login attempts
login_rate_limiter = RateLimiter(
    times=auth_config.LOGIN_RATE_LIMIT,
    seconds=auth_config.LOGIN_RATE_LIMIT_PERIOD,
    callback=lambda req: HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Too many login attempts. Please try again in {auth_config.LOGIN_RATE_LIMIT_PERIOD} seconds."
    )
) 