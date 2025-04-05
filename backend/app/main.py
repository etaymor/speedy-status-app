from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager
from .auth import auth_router, magic_links_router
from .auth.rate_limiter import setup_rate_limiter
from .routers import team, admin, submission, users, summaries
from .database import prisma
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to Redis for rate limiting
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        redis_client = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
        await FastAPILimiter.init(redis_client)
        logger.info("Connected to Redis for rate limiting")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        # Continue without rate limiting if Redis is not available
        logger.warning("Rate limiting will be disabled")

    # Connect to database
    await prisma.connect()
    logger.info("Connected to database")
    
    yield
    
    # Cleanup
    await prisma.disconnect()
    logger.info("Disconnected from database")
    
    try:
        await redis_client.close()
        logger.info("Disconnected from Redis")
    except Exception as e:
        logger.error(f"Error disconnecting from Redis: {e}")

app = FastAPI(
    title="Speedy Status API",
    description="API for managing team status updates and summaries",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000"],  # Frontend dev server and backend
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers
app.include_router(auth_router)
app.include_router(magic_links_router)
app.include_router(team.router)
app.include_router(admin.router)
app.include_router(submission.router)
app.include_router(users.router)
app.include_router(summaries.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"message": "Welcome to the Speedy Status API"} 