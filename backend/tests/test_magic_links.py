import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.auth.utils import get_password_hash
from prisma import Prisma

client = TestClient(app)

@pytest_asyncio.fixture(autouse=True)
async def setup_test_data():
    prisma = Prisma()
    await prisma.connect()
    
    # Clean up any existing test data
    await prisma.teammembership.delete_many(
        where={
            "OR": [
                {"user": {"email": {"in": ["manager@example.com", "member@example.com"]}}},
                {"team": {"name": "Test Team"}}
            ]
        }
    )
    await prisma.user.delete_many(
        where={
            "email": {"in": ["manager@example.com", "member@example.com"]}
        }
    )
    await prisma.team.delete_many(
        where={
            "name": "Test Team"
        }
    )
    
    # Create a manager user first
    manager = await prisma.user.create(
        data={
            "email": "manager@example.com",
            "name": "Test Manager",
            "role": "MANAGER",
            "passwordHash": get_password_hash("testpassword")
        }
    )
    
    # Create a test team
    team = await prisma.team.create(
        data={
            "name": "Test Team",
            "managerId": manager.id,
            "promptDay": 1,  # Monday
            "promptTime": "09:00",
            "timezone": "UTC"
        }
    )
    
    # Create a test member
    member = await prisma.user.create(
        data={
            "email": "member@example.com",
            "name": "Test Member",
            "role": "MEMBER",
            "teams": {
                "create": {
                    "teamId": team.id,
                    "status": "ACTIVE"
                }
            }
        }
    )
    
    yield {"team": team, "member": member, "manager": manager}
    
    # Cleanup
    await prisma.teammembership.delete_many(where={"userId": member.id})
    await prisma.user.delete(where={"id": member.id})
    await prisma.team.delete(where={"id": team.id})
    await prisma.user.delete(where={"id": manager.id})
    await prisma.disconnect()

@pytest.mark.asyncio
async def test_create_magic_link(setup_test_data):
    team = setup_test_data["team"]
    member = setup_test_data["member"]
    
    response = client.post(f"/api/v1/magic-links/{team.id}/{member.email}")
    assert response.status_code == 200
    data = response.json()
    assert "magic_link" in data
    assert data["magic_link"].startswith("http://")
    assert "token=" in data["magic_link"]

@pytest.mark.asyncio
async def test_create_magic_link_invalid_user(setup_test_data):
    team = setup_test_data["team"]
    
    response = client.post(f"/api/v1/magic-links/{team.id}/nonexistent@example.com")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_verify_magic_link(setup_test_data):
    team = setup_test_data["team"]
    member = setup_test_data["member"]
    
    # First create a magic link
    create_response = client.post(f"/api/v1/magic-links/{team.id}/{member.email}")
    magic_link = create_response.json()["magic_link"]
    token = magic_link.split("token=")[1]
    
    # Verify the magic link
    verify_response = client.get(f"/api/v1/magic-links/{token}")
    assert verify_response.status_code == 200
    data = verify_response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_verify_invalid_magic_link():
    response = client.get("/api/v1/magic-links/invalid-token")
    assert response.status_code == 401 