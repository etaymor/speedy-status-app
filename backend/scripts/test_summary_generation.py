import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add the parent directory to Python path so we can import our app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.database import prisma
from app.services.summary_service import summary_service
from prisma.enums import UserRole, MembershipStatus, TriggerType

async def create_test_data():
    """Create test team, users, and submissions."""
    # Create manager
    manager = await prisma.user.upsert(
        where={'email': 'test.manager@example.com'},
        data={
            'create': {
                'email': 'test.manager@example.com',
                'name': 'Test Manager',
                'role': UserRole.MANAGER
            },
            'update': {}
        }
    )

    # Create team - using a compound unique identifier
    team_name = 'Test Team'
    team = await prisma.team.find_first(
        where={
            'name': team_name,
            'managerId': manager.id
        }
    )

    if not team:
        team = await prisma.team.create(
            data={
                'name': team_name,
                'managerId': manager.id,
                'promptDay': 1,  # Monday
                'promptTime': '09:00',
                'timezone': 'UTC'
            }
        )

    # Create test members
    member_data = [
        {'email': 'member1@example.com', 'name': 'Member 1'},
        {'email': 'member2@example.com', 'name': 'Member 2'},
        {'email': 'member3@example.com', 'name': 'Member 3'}
    ]

    members = []
    for data in member_data:
        member = await prisma.user.upsert(
            where={'email': data['email']},
            data={
                'create': {
                    'email': data['email'],
                    'name': data['name'],
                    'role': UserRole.MEMBER
                },
                'update': {}
            }
        )
        members.append(member)

        # Add team membership
        await prisma.teammembership.upsert(
            where={
                'teamId_userId': {
                    'teamId': team.id,
                    'userId': member.id
                }
            },
            data={
                'create': {
                    'teamId': team.id,
                    'userId': member.id,
                    'status': MembershipStatus.ACTIVE
                },
                'update': {
                    'status': MembershipStatus.ACTIVE
                }
            }
        )

    # Create test submissions
    week_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=datetime.now().weekday())
    
    test_submissions = [
        {
            'userId': members[0].id,
            'content': """
            This week I completed the user authentication system implementation:
            - Implemented OAuth2 with JWT tokens
            - Added password hashing and validation
            - Created user registration flow
            - Added email verification
            Next week I'll work on the team management features.
            """
        },
        {
            'userId': members[1].id,
            'content': """
            Made progress on the frontend components:
            - Created responsive dashboard layout
            - Implemented team creation wizard
            - Added form validation and error handling
            - Started work on the submission form
            Planning to finish the submission form and add tests next week.
            """
        },
        {
            'userId': members[2].id,
            'content': """
            Focused on database and API work:
            - Set up PostgreSQL with Prisma
            - Created initial schema migrations
            - Built RESTful endpoints for team management
            - Added API documentation with Swagger
            Will work on the background jobs system next week.
            """
        }
    ]

    for submission in test_submissions:
        await prisma.submission.create(
            data={
                'userId': submission['userId'],
                'teamId': team.id,
                'content': submission['content'],
                'weekStartDate': week_start,
                'isLate': False
            }
        )

    return team, week_start

async def test_summary_generation():
    """Test the summary generation functionality."""
    print("🚀 Starting summary generation test...")
    
    try:
        # Connect to database
        await prisma.connect()
        print("✅ Connected to database")

        # Create test data
        team, week_start = await create_test_data()
        print("✅ Created test data")
        print(f"Team ID: {team.id}")
        print(f"Week Start: {week_start}")

        # Generate summary
        print("\n📝 Generating summary...")
        summary = await summary_service.generate_summary(
            team_id=team.id,
            week_start_date=week_start,
            trigger_type=TriggerType.MANUAL
        )

        print("\n✨ Summary generated successfully!")
        print("\nSummary Text:")
        print("-------------")
        print(summary.summaryText)
        print("\nMetadata:")
        print(f"Generated at: {summary.generatedAt}")
        print(f"Trigger type: {summary.triggerType}")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        raise
    finally:
        await prisma.disconnect()
        print("\n👋 Test complete")

if __name__ == "__main__":
    asyncio.run(test_summary_generation()) 