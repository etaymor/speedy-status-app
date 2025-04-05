from datetime import datetime, timedelta
from prisma import Prisma
from zoneinfo import ZoneInfo
import asyncio
from passlib.context import CryptContext

# Set up password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def get_monday_of_current_week() -> datetime:
    """Get the Monday of the current week"""
    now = datetime.now(ZoneInfo("UTC"))
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)

async def main():
    db = Prisma()
    await db.connect()

    # Get the current time and Monday of current week
    now = datetime.now(ZoneInfo("UTC"))
    current_monday = get_monday_of_current_week()
    
    # Create users with password hashes
    test_password = "testpass123"  # Simple password for testing
    password_hash = get_password_hash(test_password)
    
    manager = await db.user.create({
        "id": "user-1-manager",
        "email": "manager@example.com",
        "role": "MANAGER",
        "name": "Team Manager",
        "createdAt": now - timedelta(days=30),
        "lastActiveAt": now,
        "passwordHash": password_hash
    })

    members = []
    for i in range(1, 4):
        member = await db.user.create({
            "id": f"user-{i+1}-member",
            "email": f"member{i}@example.com",
            "role": "MEMBER",
            "name": f"Team Member {i}",
            "createdAt": now - timedelta(days=25 - (i * 5)),
            "lastActiveAt": now,
            "passwordHash": password_hash
        })
        members.append(member)

    # Create team
    team = await db.team.create({
        "id": "team-1",
        "name": "Engineering Team",
        "managerId": manager.id,
        "promptDay": 1,
        "promptTime": "10:00",
        "timezone": "America/Los_Angeles",
        "createdAt": now - timedelta(days=30),
        "isDeleted": False
    })

    # Create team memberships
    await db.teammembership.create({
        "id": "tm-1",
        "teamId": team.id,
        "userId": manager.id,
        "status": "ACTIVE"
    })

    for i, member in enumerate(members, 2):
        await db.teammembership.create({
            "id": f"tm-{i}",
            "teamId": team.id,
            "userId": member.id,
            "status": "ACTIVE"
        })

    # Create subscription
    await db.subscription.create({
        "id": "sub-1",
        "teamId": team.id,
        "stripeCustomerId": "cus_test123",
        "stripeSubscriptionId": "sub_test123",
        "planTier": "PRO",
        "status": "ACTIVE",
        "billingStartDate": now - timedelta(days=30),
        "trialUsed": False
    })

    # Create submissions for last 4 weeks
    submission_data = [
        # Week 4 (Current)
        {
            "content": "Completed API integration and fixed 3 critical bugs",
            "days_ago": 1,
            "member_idx": 0,
            "is_late": False
        },
        {
            "content": "Working on frontend optimizations and new feature development",
            "days_ago": 2,
            "member_idx": 1,
            "is_late": False
        },
        {
            "content": "Implemented user authentication improvements",
            "days_ago": 1,
            "member_idx": 2,
            "is_late": False
        },
        # Week 3
        {
            "content": "Started API integration work",
            "days_ago": 8,
            "member_idx": 0,
            "is_late": False
        },
        {
            "content": "Completed user dashboard redesign",
            "days_ago": 9,
            "member_idx": 1,
            "is_late": False
        },
        {
            "content": "Investigating performance issues",
            "days_ago": 8,
            "member_idx": 2,
            "is_late": False
        },
        # Week 2
        {
            "content": "Code review and documentation updates",
            "days_ago": 15,
            "member_idx": 0,
            "is_late": False
        },
        {
            "content": "Started user dashboard redesign",
            "days_ago": 16,
            "member_idx": 1,
            "is_late": False
        },
        {
            "content": "Fixed critical security vulnerability",
            "days_ago": 15,
            "member_idx": 2,
            "is_late": True
        },
        # Week 1
        {
            "content": "Initial project setup and planning",
            "days_ago": 22,
            "member_idx": 0,
            "is_late": False
        },
        {
            "content": "Research and architecture planning",
            "days_ago": 23,
            "member_idx": 1,
            "is_late": False
        },
        {
            "content": "Development environment setup",
            "days_ago": 22,
            "member_idx": 2,
            "is_late": False
        }
    ]

    for i, data in enumerate(submission_data):
        week = i // 3  # 3 submissions per week
        week_start = current_monday - timedelta(weeks=week)
        submit_date = week_start + timedelta(days=data["days_ago"] % 7)  # Keep within the week
        
        await db.submission.create({
            "id": f"sub-w{4-week}-{(i%3)+1}",
            "userId": members[data["member_idx"]].id,
            "teamId": team.id,
            "content": data["content"],
            "submittedAt": submit_date,
            "weekStartDate": week_start,
            "isLate": data["is_late"]
        })

    # Create weekly summaries
    summary_data = [
        {
            "week": 1,
            "text": "Project successfully initiated with environment setup completed. Team aligned on architecture and planning. Strong foundation laid for upcoming development work.",
            "trigger": "ALL_SUBMITTED"
        },
        {
            "week": 2,
            "text": "Documentation was improved and code reviews completed. A critical security vulnerability was addressed, though slightly delayed. The user dashboard redesign project was initiated.",
            "trigger": "TIMEOUT"
        },
        {
            "week": 3,
            "text": "Team made significant progress on API integration and user dashboard redesign. Performance issues were identified and are being investigated. All team members contributed to their assigned tasks.",
            "trigger": "ALL_SUBMITTED"
        }
    ]

    for data in summary_data:
        week_start = current_monday - timedelta(weeks=4 - data["week"])
        await db.weeklysummary.create({
            "id": f"ws-w{data['week']}",
            "teamId": team.id,
            "weekStartDate": week_start,
            "summaryText": data["text"],
            "generatedAt": week_start + timedelta(days=5),  # Generated on Friday
            "updatedAt": week_start + timedelta(days=5),
            "triggerType": data["trigger"]
        })

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main()) 