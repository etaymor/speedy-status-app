import asyncio
from prisma import Prisma
from datetime import datetime, UTC

async def main():
    # Initialize Prisma client
    prisma = Prisma()
    await prisma.connect()

    try:
        # Check test user
        test_email = "test@example.com"
        user = await prisma.user.find_first(
            where={"email": test_email},
            include={
                "teams": {
                    "include": {
                        "team": True
                    }
                }
            }
        )
        
        print("\nTest Data Status:")
        print("================")
        
        if user:
            print(f"\nUser Found:")
            print(f"  ID: {user.id}")
            print(f"  Email: {user.email}")
            print(f"  Name: {user.name}")
            print(f"  Role: {user.role}")
            
            if user.teams:
                print("\nTeam Memberships:")
                for membership in user.teams:
                    print(f"\n  Team: {membership.team.name}")
                    print(f"  Team ID: {membership.team.id}")
                    print(f"  Status: {membership.status}")
                    print(f"  Manager ID: {membership.team.managerId}")
            else:
                print("\nNo team memberships found!")
        else:
            print("\nTest user not found!")
            
        # List all users
        print("\nAll Users in Database:")
        print("=====================")
        all_users = await prisma.user.find_many()
        for u in all_users:
            print(f"\n  {u.name} ({u.email})")
            print(f"  ID: {u.id}")
            print(f"  Role: {u.role}")
            
    finally:
        await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(main()) 