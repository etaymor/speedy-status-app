from prisma import Prisma

# Initialize Prisma client
prisma = Prisma()

# Export the client instance
__all__ = ['prisma'] 