from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .auth import auth_router, magic_links_router
from .auth.rate_limiter import setup_rate_limiter
from .routers import team, admin, submission
from .database import connect_db, disconnect_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to database
    await connect_db()
    # Initialize rate limiter
    await setup_rate_limiter()
    
    yield
    
    # Disconnect from database
    await disconnect_db()

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

@app.get("/health")
async def health_check():
    return {"status": "ok"} 