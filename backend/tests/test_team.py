import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from datetime import datetime
from app.main import app
from app.database import prisma
from app.utils.exceptions import TeamError

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
async def test_manager():
    # Create a test manager
    manager = await prisma.user.create({
        "data": {
            "email": "test.manager@example.com",
            "role": "MANAGER",
            "name": "Test Manager"
        }
    })
    yield manager
    # Cleanup
    await prisma.user.delete(where={"id": manager.id})

@pytest.fixture
async def test_team(test_manager):
    # Create a test team
    team = await prisma.team.create({
        "data": {
            "name": "Test Team",
            "manager_id": test_manager.id,
            "prompt_day": 1,
            "prompt_time": "09:00",
            "timezone": "UTC"
        }
    })
    yield team
    # Cleanup
    await prisma.team.delete(where={"id": team.id})

@pytest.mark.asyncio
async def test_create_team_success(client, test_manager):
    """Test successful team creation."""
    team_data = {
        "name": "New Test Team",
        "prompt_day": 1,
        "prompt_time": "09:00",
        "timezone": "America/New_York"
    }
    
    response = client.post(
        "/api/v1/team",
        json=team_data,
        headers={"Authorization": f"Bearer {test_manager.id}"}  # Simplified auth for testing
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == team_data["name"]
    assert data["prompt_day"] == team_data["prompt_day"]
    assert data["prompt_time"] == team_data["prompt_time"]
    assert data["timezone"] == team_data["timezone"]

@pytest.mark.asyncio
async def test_create_team_invalid_timezone(client, test_manager):
    """Test team creation with invalid timezone."""
    team_data = {
        "name": "New Test Team",
        "prompt_day": 1,
        "prompt_time": "09:00",
        "timezone": "Invalid/Timezone"
    }
    
    response = client.post(
        "/api/v1/team",
        json=team_data,
        headers={"Authorization": f"Bearer {test_manager.id}"}
    )
    
    assert response.status_code == 422  # Validation error

@pytest.mark.asyncio
async def test_add_team_members_success(client, test_team, test_manager):
    """Test successful addition of team members."""
    member_data = {
        "emails": ["member1@example.com", "member2@example.com"]
    }
    
    response = client.post(
        f"/api/v1/team/members?team_id={test_team.id}",
        json=member_data,
        headers={"Authorization": f"Bearer {test_manager.id}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 2
    assert all(r["status"] in ["added", "already_member"] for r in data["results"])

@pytest.mark.asyncio
async def test_add_team_members_unauthorized(client, test_team):
    """Test adding members without authorization."""
    member_data = {
        "emails": ["member1@example.com"]
    }
    
    response = client.post(
        f"/api/v1/team/members?team_id={test_team.id}",
        json=member_data,
        headers={"Authorization": "Bearer invalid_token"}
    )
    
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_update_schedule_success(client, test_team, test_manager):
    """Test successful schedule update."""
    schedule_data = {
        "prompt_day": 2,
        "prompt_time": "10:00",
        "timezone": "Europe/London"
    }
    
    response = client.put(
        f"/api/v1/team/{test_team.id}/schedule",
        json=schedule_data,
        headers={"Authorization": f"Bearer {test_manager.id}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["prompt_day"] == schedule_data["prompt_day"]
    assert data["prompt_time"] == schedule_data["prompt_time"]
    assert data["timezone"] == schedule_data["timezone"]

@pytest.mark.asyncio
async def test_update_schedule_invalid_time(client, test_team, test_manager):
    """Test schedule update with invalid time format."""
    schedule_data = {
        "prompt_day": 2,
        "prompt_time": "25:00",  # Invalid time
        "timezone": "UTC"
    }
    
    response = client.put(
        f"/api/v1/team/{test_team.id}/schedule",
        json=schedule_data,
        headers={"Authorization": f"Bearer {test_manager.id}"}
    )
    
    assert response.status_code == 422  # Validation error

@pytest.mark.asyncio
async def test_list_timezones(client):
    """Test timezone listing endpoint."""
    response = client.get("/api/v1/team/timezones")
    
    assert response.status_code == 200
    data = response.json()
    assert "timezones" in data
    assert len(data["timezones"]) > 0
    assert "UTC" in data["timezones"]

@pytest.mark.asyncio
async def test_team_transaction_rollback(client, test_team, test_manager):
    """Test transaction rollback when adding members fails."""
    # Create a situation that would cause a transaction to fail
    member_data = {
        "emails": ["invalid.email"]  # This will cause validation to fail
    }
    
    response = client.post(
        f"/api/v1/team/members?team_id={test_team.id}",
        json=member_data,
        headers={"Authorization": f"Bearer {test_manager.id}"}
    )
    
    assert response.status_code == 422  # Validation error
    
    # Verify no partial data was saved
    team = await prisma.team.find_unique(
        where={"id": test_team.id},
        include={"members": True}
    )
    assert len(team.members) == 0 