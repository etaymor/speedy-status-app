import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.auth.utils import get_password_hash
from prisma import Prisma

client = TestClient(app)

@pytest_asyncio.fixture(autouse=True)
async def setup_test_user():
    prisma = Prisma()
    await prisma.connect()
    
    # Create a test user
    test_user = await prisma.user.create(
        data={
            "email": "test@example.com",
            "name": "Test User",
            "role": "MANAGER",
            "passwordHash": get_password_hash("testpassword")
        }
    )
    
    yield test_user
    
    # Cleanup
    await prisma.user.delete(where={"id": test_user.id})
    await prisma.disconnect()

@pytest.mark.asyncio
async def test_login_success():
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "test@example.com",
            "password": "testpassword"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_credentials():
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "test@example.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_refresh_token():
    # First login to get tokens
    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "test@example.com",
            "password": "testpassword"
        }
    )
    refresh_token = login_response.json()["refresh_token"]
    
    # Use refresh token to get new tokens
    response = client.post(
        "/api/v1/auth/token",
        json={"refresh_token": refresh_token}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

@pytest.mark.asyncio
async def test_protected_route():
    # First login to get token
    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "test@example.com",
            "password": "testpassword"
        }
    )
    access_token = login_response.json()["access_token"]
    
    # Test logout endpoint (protected route)
    response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Successfully logged out" 