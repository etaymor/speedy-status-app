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
from ...main import app
from ...auth.utils import create_access_token

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

@pytest.fixture
def test_client():
    return TestClient(app)

@pytest.fixture
def auth_headers():
    token = create_access_token(
        data={"sub": "test_user", "team_id": "test_team", "type": "access"}
    )
    return {"Authorization": f"Bearer {token}"}

async def test_submission_rate_limit(test_client, auth_headers):
    """Test that submission endpoint enforces rate limits."""
    submission_data = {
        "content": "Test status update",
        "team_id": "test_team",
        "user_id": "test_user"
    }

    # Make 6 requests (rate limit is 5 per minute)
    responses = []
    for _ in range(6):
        response = test_client.post(
            "/api/v1/submissions",
            json=submission_data,
            headers=auth_headers
        )
        responses.append(response)
        await asyncio.sleep(0.1)  # Small delay between requests

    # First 5 should succeed
    for response in responses[:5]:
        assert response.status_code == 201, "First 5 requests should succeed"

    # 6th should fail with rate limit error
    assert responses[5].status_code == 429, "6th request should be rate limited"
    assert "Too Many Requests" in responses[5].json()["detail"]

async def test_edit_rate_limit(test_client, auth_headers):
    """Test that edit endpoint enforces rate limits."""
    # First create a submission
    submission_data = {
        "content": "Initial content",
        "team_id": "test_team",
        "user_id": "test_user"
    }
    create_response = test_client.post(
        "/api/v1/submissions",
        json=submission_data,
        headers=auth_headers
    )
    assert create_response.status_code == 201
    submission_id = create_response.json()["id"]

    # Make 11 edit requests (rate limit is 10 per minute)
    update_data = {"content": "Updated content"}
    responses = []
    for _ in range(11):
        response = test_client.put(
            f"/api/v1/submissions/{submission_id}",
            json=update_data,
            headers=auth_headers
        )
        responses.append(response)
        await asyncio.sleep(0.1)  # Small delay between requests

    # First 10 should succeed
    for response in responses[:10]:
        assert response.status_code == 200, "First 10 requests should succeed"

    # 11th should fail with rate limit error
    assert responses[10].status_code == 429, "11th request should be rate limited"
    assert "Too Many Requests" in responses[10].json()["detail"]

async def test_rate_limit_resets(test_client, auth_headers):
    """Test that rate limits reset after the time window."""
    submission_data = {
        "content": "Test status update",
        "team_id": "test_team",
        "user_id": "test_user"
    }

    # Make 5 requests (hitting the limit)
    for _ in range(5):
        response = test_client.post(
            "/api/v1/submissions",
            json=submission_data,
            headers=auth_headers
        )
        assert response.status_code == 201

    # Wait for rate limit window to expire (61 seconds)
    await asyncio.sleep(61)

    # Should be able to make another request
    response = test_client.post(
        "/api/v1/submissions",
        json=submission_data,
        headers=auth_headers
    )
    assert response.status_code == 201, "Should be able to submit after rate limit window" 