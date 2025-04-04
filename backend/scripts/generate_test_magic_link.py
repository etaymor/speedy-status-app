import asyncio
from prisma import Prisma
from datetime import datetime, timedelta, UTC
from jose import jwt
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the secret key from environment variables
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set")

async def main():
    # Initialize Prisma client
    prisma = Prisma()
    await prisma.connect()

    try:
        # Create a test user if doesn't exist
        test_email = "test@example.com"
        user = await prisma.user.find_first(
            where={"email": test_email}
        )
        
        if not user:
            user = await prisma.user.create({
                "email": test_email,
                "role": "MEMBER",
                "name": "Test User"
            })
        elif user.role != "MEMBER":
            # Update existing user to MEMBER if needed
            user = await prisma.user.update(
                where={"id": user.id},
                data={"role": "MEMBER"}
            )
        
        # Create a test team if doesn't exist
        team = await prisma.team.find_first(
            where={
                "name": "Test Team",
                "managerId": user.id
            }
        )
        
        if not team:
            # For test team, we need a manager
            manager = await prisma.user.create({
                "email": "manager@example.com",
                "role": "MANAGER",
                "name": "Test Manager"
            })
            
            team = await prisma.team.create({
                "name": "Test Team",
                "managerId": manager.id,
                "promptDay": 1,  # Monday
                "promptTime": "09:00",
                "timezone": "UTC"
            })
        
        # Ensure active team membership exists
        team_membership = await prisma.teammembership.find_first(
            where={
                "userId": user.id,
                "teamId": team.id
            }
        )
        
        if not team_membership:
            team_membership = await prisma.teammembership.create({
                "userId": user.id,
                "teamId": team.id,
                "status": "ACTIVE"
            })
        elif team_membership.status != "ACTIVE":
            team_membership = await prisma.teammembership.update(
                where={"id": team_membership.id},
                data={"status": "ACTIVE"}
            )

        # Generate magic link token
        token_data = {
            "sub": user.id,
            "team_id": team.id,
            "type": "magic-link",
            "exp": datetime.now(UTC) + timedelta(hours=72)
        }
        
        # Use the SECRET_KEY from environment variables
        token = jwt.encode(
            token_data,
            SECRET_KEY,
            algorithm="HS256"
        )

        # Print the magic link
        base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        magic_link = f"{base_url}/submit?token={token}"
        
        print("\nTest Data Created:")
        print(f"User ID: {user.id}")
        print(f"Team ID: {team.id}")
        print(f"Using SECRET_KEY: {SECRET_KEY}")  # Print the secret key being used
        print(f"\nMagic Link (valid for 72 hours):")
        print(magic_link)
        
    finally:
        await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(main()) 