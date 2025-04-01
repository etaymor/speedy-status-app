import pytest
import pytest_asyncio
import asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from app.auth.utils import create_token
from app.routers.submission import router
from app.database import prisma
from prisma.enums import UserRole, MembershipStatus, JobStatus, Channel

# Setup test app
app = FastAPI()
app.include_router(router)
client = TestClient(app)

@pytest_asyncio.fixture(scope="function")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(autouse=True)
async def setup_prisma():
    """Setup and teardown Prisma client for tests"""
    await prisma.connect()
    yield
    await prisma.disconnect()

@pytest_asyncio.fixture
async def test_user():
    """Create a test user"""
    now = datetime.now(timezone.utc)
    unique_id = str(uuid4())
    data = {
        "id": unique_id,
        "email": f"test-{unique_id}@example.com",
        "name": "Test User",
        "role": UserRole.MEMBER,
        "passwordHash": None,
        "authProviderId": None,
        "createdAt": now,
        "lastActiveAt": now
    }
    user = await prisma.user.create(data=data)
    yield user
    try:
        await prisma.user.delete(where={"id": user.id})
    except Exception:
        pass

@pytest_asyncio.fixture
async def test_team(test_user):
    """Create a test team"""
    data = {
        "id": str(uuid4()),
        "name": "Test Team",
        "managerId": test_user.id,
        "promptDay": 1,
        "promptTime": "09:00",
        "timezone": "UTC",
        "createdAt": datetime.now(timezone.utc),
        "isDeleted": False
    }
    team = await prisma.team.create(data=data)
    yield team
    try:
        await prisma.team.delete(where={"id": team.id})
    except:
        pass

@pytest_asyncio.fixture
async def test_membership_pending(test_user, test_team):
    """Create a pending team membership"""
    data = {
        "id": str(uuid4()),
        "userId": test_user.id,
        "teamId": test_team.id,
        "status": MembershipStatus.PENDING
    }
    membership = await prisma.teammembership.create(data=data)
    yield membership
    try:
        await prisma.teammembership.delete(where={"id": membership.id})
    except Exception:
        pass

@pytest_asyncio.fixture
async def test_membership_active(test_user, test_team):
    """Create an active team membership"""
    data = {
        "id": str(uuid4()),
        "userId": test_user.id,
        "teamId": test_team.id,
        "status": MembershipStatus.ACTIVE
    }
    membership = await prisma.teammembership.create(data=data)
    yield membership
    try:
        await prisma.teammembership.delete(where={"id": membership.id})
    except Exception:
        pass

@pytest_asyncio.fixture
def valid_token(test_user):
    """Create a valid JWT token"""
    return create_token({"sub": test_user.id, "type": "access"})

@pytest_asyncio.fixture
async def test_prompt(test_team):
    """Create a test scheduled prompt"""
    data = {
        "id": str(uuid4()),
        "teamId": test_team.id,
        "scheduledFor": datetime.now(timezone.utc) - timedelta(hours=1),
        "status": JobStatus.SENT,
        "channel": [Channel.EMAIL],
        "createdAt": datetime.now(timezone.utc)
    }
    prompt = await prisma.scheduledpromptjob.create(data=data)
    yield prompt
    try:
        await prisma.scheduledpromptjob.delete(where={"id": prompt.id})
    except Exception:
        pass

@pytest.mark.asyncio
async def test_create_submission_success(
    test_user,
    test_team,
    test_membership_active,
    test_prompt,
    valid_token
):
    """Test successful submission creation"""
    response = client.post(
        "/api/v1/submissions",
        json={
            "content": "Test submission content",
            "team_id": test_team.id,
            "user_id": test_user.id
        },
        headers={"Authorization": f"Bearer {valid_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "Test submission content"
    assert not data["is_late"]  # Should not be late as prompt was 1 hour ago
    
    # Cleanup
    try:
        await prisma.submission.delete(where={"id": data["id"]})
    except Exception:
        pass

@pytest.mark.asyncio
async def test_late_submission(
    test_user,
    test_team,
    test_membership_active,
    valid_token
):
    """Test submission marked as late"""
    # Create an old prompt (25 hours ago)
    data = {
        "id": str(uuid4()),
        "teamId": test_team.id,
        "scheduledFor": datetime.now(timezone.utc) - timedelta(hours=25),
        "status": JobStatus.SENT,
        "channel": [Channel.EMAIL],
        "createdAt": datetime.now(timezone.utc)
    }
    old_prompt = await prisma.scheduledpromptjob.create(data=data)

    response = client.post(
        "/api/v1/submissions",
        json={
            "content": "Test content",
            "team_id": test_team.id,
            "user_id": test_user.id
        },
        headers={"Authorization": f"Bearer {valid_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_late"]

    # Cleanup
    try:
        await prisma.submission.delete(where={"id": data["id"]})
        await prisma.scheduledpromptjob.delete(where={"id": old_prompt.id})
    except Exception:
        pass

@pytest.mark.asyncio
async def test_invalid_token():
    """Test submission with invalid token"""
    response = client.post(
        "/api/v1/submissions",
        json={
            "content": "Test content",
            "team_id": "test-team",
            "user_id": "test-user"
        },
        headers={"Authorization": "Bearer invalid-token"}
    )

    assert response.status_code == 401

@pytest.mark.asyncio
async def test_non_member_submission(
    test_user,
    test_team,
    valid_token
):
    """Test submission from non-team member"""
    response = client.post(
        "/api/v1/submissions",
        json={
            "content": "Test content",
            "team_id": test_team.id,
            "user_id": test_user.id
        },
        headers={"Authorization": f"Bearer {valid_token}"}
    )

    assert response.status_code == 403
    assert "not a member of this team" in response.json()["detail"]

@pytest.mark.asyncio
async def test_no_prompt_submission(
    test_user,
    test_team,
    test_membership_active,
    valid_token
):
    """Test submission when no prompt has been sent"""
    response = client.post(
        "/api/v1/submissions",
        json={
            "content": "Test content",
            "team_id": test_team.id,
            "user_id": test_user.id
        },
        headers={"Authorization": f"Bearer {valid_token}"}
    )

    assert response.status_code == 200

@pytest.mark.asyncio
async def test_invalid_team_id(
    test_user,
    valid_token
):
    """Test submission with non-existent team"""
    response = client.post(
        "/api/v1/submissions",
        json={
            "content": "Test content",
            "team_id": "non-existent-team",
            "user_id": test_user.id
        },
        headers={"Authorization": f"Bearer {valid_token}"}
    )

    assert response.status_code == 404
    assert "Team not found" in response.json()["detail"] 