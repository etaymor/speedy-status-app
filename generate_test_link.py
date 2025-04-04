from jose import jwt
import time
import uuid
from dotenv import load_dotenv
import os
from prisma import Prisma
import asyncio

# Load environment variables from .env
load_dotenv('backend/.env')
SECRET_KEY = os.getenv('SECRET_KEY')

if not SECRET_KEY:
    raise ValueError("SECRET_KEY not found in .env file")

async def generate_test_link():
    # Initialize Prisma client
    prisma = Prisma()
    await prisma.connect()
    
    try:
        # Create a test user if doesn't exist
        test_email = "test@example.com"
        test_user = await prisma.user.find_first(where={"email": test_email})
        
        if not test_user:
            test_user = await prisma.user.create(data={
                "email": test_email,
                "name": "Test User",
                "role": "MEMBER"
            })
        
        # Create a test team if doesn't exist
        test_team = await prisma.team.find_first(where={"name": "Test Team"})
        
        if not test_team:
            test_team = await prisma.team.create(data={
                "name": "Test Team",
                "managerId": test_user.id,
                "promptDay": 1,
                "promptTime": "09:00",
                "timezone": "UTC"
            })
        
        # Create or update team membership
        team_membership = await prisma.teammembership.find_first(
            where={
                "userId": test_user.id,
                "teamId": test_team.id
            }
        )
        
        if not team_membership:
            await prisma.teammembership.create(data={
                "userId": test_user.id,
                "teamId": test_team.id,
                "status": "ACTIVE"
            })
        elif team_membership.status != "ACTIVE":
            await prisma.teammembership.update(
                where={
                    "id": team_membership.id
                },
                data={
                    "status": "ACTIVE"
                }
            )

        # Create a test token
        token = jwt.encode(
            {
                'sub': test_user.id,
                'team_id': test_team.id,
                'type': 'magic-link',
                'exp': int(time.time()) + 3600  # 1 hour from now
            },
            SECRET_KEY,
            algorithm='HS256'
        )

        print("\nTest User Details:")
        print("-----------------")
        print(f"ID: {test_user.id}")
        print(f"Email: {test_user.email}")
        print(f"Team ID: {test_team.id}")
        print("\nMagic Link (single line):")
        print("-----------------------")
        magic_link = f"http://localhost:5173/submit?token={token}"
        print(magic_link, end='')  # Prevent newline
        print("\n\nToken Payload:")
        print("--------------")
        print(jwt.decode(token, SECRET_KEY, algorithms=['HS256']))

    finally:
        await prisma.disconnect()

# Run the async function
asyncio.run(generate_test_link()) 