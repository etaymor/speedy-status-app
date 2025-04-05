import pytest
import pytest_asyncio
import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from prisma.models import User, Team, TeamMembership, Submission
from prisma.enums import UserRole, MembershipStatus
from app.database import prisma

@pytest_asyncio.fixture(scope="session")
def event_loop_policy():
    """Create and return the event loop policy."""
    return asyncio.get_event_loop_policy()

@pytest_asyncio.fixture(scope="session")
def event_loop(event_loop_policy):
    """Create and return the event loop."""
    loop = event_loop_policy.new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture
async def prisma_client():
    """Return the Prisma client instance."""
    return prisma

@pytest_asyncio.fixture(autouse=True)
async def setup_database(prisma_client):
    """Setup database connection and cleanup before each test."""
    if not prisma_client.is_connected():
        await prisma_client.connect()
    
    # Clean up any existing test data in the correct order
    await prisma_client.submission.delete_many()
    await prisma_client.weeklysummary.delete_many()
    await prisma_client.teammembership.delete_many()
    await prisma_client.scheduledpromptjob.delete_many()  # Delete jobs before teams
    await prisma_client.team.delete_many()
    await prisma_client.user.delete_many()
    
    yield
    
    # Clean up after test
    await prisma_client.submission.delete_many()
    await prisma_client.weeklysummary.delete_many()
    await prisma_client.teammembership.delete_many()
    await prisma_client.scheduledpromptjob.delete_many()
    await prisma_client.team.delete_many()
    await prisma_client.user.delete_many()
    
    if prisma_client.is_connected():
        await prisma_client.disconnect()

@pytest_asyncio.fixture
async def test_manager():
    """Create a test manager user."""
    unique_id = str(uuid.uuid4())[:8]
    return await prisma.user.create(
        data={
            'email': f'test.manager.{unique_id}@example.com',
            'name': 'Test Manager',
            'role': UserRole.MANAGER
        }
    )

@pytest_asyncio.fixture
async def test_team():
    """Create a test team."""
    # Create manager user
    manager = await prisma.user.create(
        data={
            'email': f'manager.{uuid.uuid4().hex[:8]}@example.com',
            'name': 'Test Manager',
            'role': 'MANAGER',
            'lastActiveAt': datetime.now(timezone.utc) + timedelta(days=365)
        }
    )

    # Create team
    team = await prisma.team.create(
        data={
            'name': 'Test Team',
            'managerId': manager.id,
            'promptDay': 4,  # Friday
            'promptTime': '17:00',
            'timezone': 'UTC'
        }
    )

    yield team

    # Cleanup in correct order: team first, then manager
    try:
        await prisma.team.delete(where={'id': team.id})
    except Exception as e:
        print(f"Error during team cleanup: {e}")

    try:
        await prisma.user.delete(where={'id': manager.id})
    except Exception as e:
        print(f"Error during manager cleanup: {e}")

@pytest_asyncio.fixture
async def test_members(test_team):
    """Create test team members."""
    members = []
    delete_funcs = {}

    for i in range(1, 3):
        # Create user
        user = await prisma.user.create(
            data={
                'email': f'member{i}.{uuid.uuid4().hex[:8]}@example.com',
                'name': f'Member {i}',
                'role': 'MEMBER',
                'lastActiveAt': datetime.now(timezone.utc) + timedelta(days=365)
            }
        )
        
        # Create team membership
        membership = await prisma.teammembership.create(
            data={
                'userId': user.id,
                'teamId': test_team.id,
                'status': 'ACTIVE'
            }
        )
        
        members.append(user)
        
        # Store delete functions for cleanup
        user_id = user.id
        membership_id = membership.id
        delete_funcs[f"membership_{membership_id}"] = lambda mid=membership_id: prisma.teammembership.delete(where={'id': mid})
        delete_funcs[f"user_{user_id}"] = lambda uid=user_id: prisma.user.delete(where={'id': uid})

    yield members

    # Cleanup in reverse order: memberships first, then users
    for key, delete_func in delete_funcs.items():
        try:
            if key.startswith('membership_'):
                await delete_func()
        except Exception as e:
            print(f"Error during membership cleanup: {e}")

    for key, delete_func in delete_funcs.items():
        try:
            if key.startswith('user_'):
                await delete_func()
        except Exception as e:
            print(f"Error during user cleanup: {e}")

@pytest_asyncio.fixture
async def test_submissions(test_members, test_team):
    """Create test submissions for each member."""
    submissions = []
    delete_funcs = {}

    for member in test_members:
        submission = await prisma.submission.create(
            data={
                'userId': member.id,
                'teamId': test_team.id,
                'content': f"Test submission from {member.name}",
                'submittedAt': datetime.now(timezone.utc),
                'weekStartDate': datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0),
                'isLate': False
            },
            include={
                'user': True
            }
        )
        submissions.append(submission)
        
        # Store delete function for cleanup
        submission_id = submission.id
        delete_funcs[submission_id] = lambda sid=submission_id: prisma.submission.delete(where={'id': sid})

    yield submissions, delete_funcs

    # Cleanup submissions first
    for delete_func in delete_funcs.values():
        try:
            await delete_func()
        except Exception as e:
            print(f"Error during submission cleanup: {e}") 