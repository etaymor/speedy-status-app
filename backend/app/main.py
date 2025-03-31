from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .auth import auth_router, magic_links_router
from .auth.rate_limiter import setup_rate_limiter
from .routers import team, admin

app = FastAPI(
    title="Speedy Status API",
    description="API for managing team status updates and summaries",
    version="1.0.0"
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

# Initialize rate limiter on startup
@app.on_event("startup")
async def startup_event():
    await setup_rate_limiter()

# Include routers
app.include_router(auth_router)
app.include_router(magic_links_router)
app.include_router(team.router)
app.include_router(admin.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"} 