from prisma import Prisma
import asyncio

async def reset_db():
    db = Prisma()
    await db.connect()
    
    # Delete all records in reverse order of dependencies
    await db.weeklysummary.delete_many()
    await db.submission.delete_many()
    await db.subscription.delete_many()
    await db.teammembership.delete_many()
    await db.team.delete_many()
    await db.user.delete_many()
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(reset_db()) 