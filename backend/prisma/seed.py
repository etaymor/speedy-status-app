import asyncio
from prisma import Prisma

async def seed():
    db = Prisma()
    await db.connect()
    
    try:
        # Create a manager user
        manager = await db.user.create(
            data={
                "email": "manager@speedystatus.com",
                "name": "Demo Manager",
                "role": "MANAGER"
            }
        )
        
        # Create a team
        team = await db.team.create(
            data={
                "name": "Demo Team",
                "managerId": manager.id,
                "promptDay": 1,  # Monday
                "promptTime": "09:00",
                "timezone": "UTC"
            }
        )
        
        # Create some team members
        member1 = await db.user.create(
            data={
                "email": "member1@speedystatus.com",
                "name": "Team Member 1",
                "role": "MEMBER"
            }
        )
        
        member2 = await db.user.create(
            data={
                "email": "member2@speedystatus.com",
                "name": "Team Member 2",
                "role": "MEMBER"
            }
        )
        
        # Add members to team
        await db.teammembership.create(
            data={
                "teamId": team.id,
                "userId": member1.id,
                "status": "ACTIVE"
            }
        )
        
        await db.teammembership.create(
            data={
                "teamId": team.id,
                "userId": member2.id,
                "status": "ACTIVE"
            }
        )
        
        print("✅ Database seeded successfully!")
        
    except Exception as e:
        print(f"❌ Error seeding database: {str(e)}")
        raise
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(seed()) 