from prisma import Prisma
from contextlib import asynccontextmanager

# Initialize Prisma client
prisma = Prisma()

@asynccontextmanager
async def get_prisma():
    """Get a Prisma client instance."""
    await prisma.connect()
    try:
        yield prisma
    finally:
        await prisma.disconnect()

# Connect on startup
async def connect_db():
    """Connect to the database."""
    await prisma.connect()

# Disconnect on shutdown
async def disconnect_db():
    """Disconnect from the database."""
    await prisma.disconnect()

# Export the client instance
__all__ = ['prisma'] 