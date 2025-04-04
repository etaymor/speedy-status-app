import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from app.main import app
from app.auth.utils import create_token
from app.database import prisma

client = TestClient(app)

@pytest_asyncio.fixture(autouse=True)
async def setup_test_data():
    """Setup test data for submissions"""
    await prisma.connect()
    
    # Create test user
    user = await prisma.user.create({
        "data": {
            "email": "test.member@example.com",
            "name": "Test Member",
            "role": "MEMBER"
        }
    })
    
    # Create test team
    team = await prisma.team.create({
        "data": {
            "name": "Test Team",
            "managerId": "test-manager",
            "promptDay": 1,
            "promptTime": "09:00",
            "timezone": "UTC"
        }
    })
    
    # Create team membership
    membership = await prisma.teammembership.create({
        "data": {
            "userId": user.id,
            "teamId": team.id,
            "status": "ACTIVE"
        }
    })
    
    # Create test prompt
    prompt = await prisma.scheduledpromptjob.create({
        "data": {
            "teamId": team.id,
            "scheduledFor": datetime.now() - timedelta(hours=1),
            "status": "SENT",
            "channel": ["EMAIL"]
        }
    })
    
    # Create access token
    token = create_token(
        data={"sub": user.id, "type": "access"},
        expires_delta=timedelta(minutes=30)
    )
    
    yield {
        "user": user,
        "team": team,
        "membership": membership,
        "prompt": prompt,
        "token": token
    }
    
    # Cleanup
    await prisma.submission.delete_many(where={"userId": user.id})
    await prisma.scheduledpromptjob.delete_many(where={"teamId": team.id})
    await prisma.teammembership.delete_many(where={"userId": user.id})
    await prisma.team.delete(where={"id": team.id})
    await prisma.user.delete(where={"id": user.id})
    await prisma.disconnect()

@pytest.mark.asyncio
async def test_create_submission_success(setup_test_data):
    """Test successful submission creation"""
    response = client.post(
        "/api/v1/submissions",
        json={
            "content": "Test submission content",
            "team_id": setup_test_data["team"].id,
            "user_id": setup_test_data["user"].id
        },
        headers={"Authorization": f"Bearer {setup_test_data['token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "Test submission content"
    assert not data["is_late"]

@pytest.mark.asyncio
async def test_late_submission(setup_test_data):
    """Test submission marked as late"""
    # Create an old prompt (25 hours ago)
    old_prompt = await prisma.scheduledpromptjob.create({
        "data": {
            "teamId": setup_test_data["team"].id,
            "scheduledFor": datetime.now() - timedelta(hours=25),
            "status": "SENT",
            "channel": ["EMAIL"]
        }
    })
    
    response = client.post(
        "/api/v1/submissions",
        json={
            "content": "Late submission",
            "team_id": setup_test_data["team"].id,
            "user_id": setup_test_data["user"].id
        },
        headers={"Authorization": f"Bearer {setup_test_data['token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["is_late"]
    
    # Cleanup
    await prisma.scheduledpromptjob.delete(where={"id": old_prompt.id})

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
async def test_non_member_submission(setup_test_data):
    """Test submission from non-team member"""
    # Create a different team
    other_team = await prisma.team.create({
        "data": {
            "name": "Other Team",
            "managerId": "other-manager",
            "promptDay": 1,
            "promptTime": "09:00",
            "timezone": "UTC"
        }
    })
    
    response = client.post(
        "/api/v1/submissions",
        json={
            "content": "Test content",
            "team_id": other_team.id,
            "user_id": setup_test_data["user"].id
        },
        headers={"Authorization": f"Bearer {setup_test_data['token']}"}
    )
    
    assert response.status_code == 403
    assert "not a member of this team" in response.json()["detail"]
    
    # Cleanup
    await prisma.team.delete(where={"id": other_team.id})

@pytest.mark.asyncio
async def test_no_prompt_submission(setup_test_data):
    """Test submission when no prompt has been sent"""
    # Delete existing prompts
    await prisma.scheduledpromptjob.delete_many(
        where={"teamId": setup_test_data["team"].id}
    )
    
    response = client.post(
        "/api/v1/submissions",
        json={
            "content": "Test content",
            "team_id": setup_test_data["team"].id,
            "user_id": setup_test_data["user"].id
        },
        headers={"Authorization": f"Bearer {setup_test_data['token']}"}
    )
    
    assert response.status_code == 400
    assert "No prompt has been sent yet" in response.json()["detail"]

@pytest.mark.asyncio
async def test_invalid_team_id(setup_test_data):
    """Test submission with non-existent team"""
    response = client.post(
        "/api/v1/submissions",
        json={
            "content": "Test content",
            "team_id": "non-existent-team",
            "user_id": setup_test_data["user"].id
        },
        headers={"Authorization": f"Bearer {setup_test_data['token']}"}
    )
    
    assert response.status_code == 404
    assert "Team not found" in response.json()["detail"] 