import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from ..app.models import User
from ..app.auth import create_access_token

@pytest.mark.asyncio
async def test_get_user_success(app: FastAPI, client: AsyncClient, test_db):
    # Create a test manager
    manager = await test_db.user.create({
        "email": "manager@test.com",
        "name": "Test Manager",
        "role": "MANAGER",
        "passwordHash": "dummy_hash"
    })
    
    # Create a test member
    member = await test_db.user.create({
        "email": "member@test.com",
        "name": "Test Member",
        "role": "MEMBER"
    })
    
    # Create a team with the manager
    team = await test_db.team.create({
        "name": "Test Team",
        "managerId": manager.id,
        "promptDay": 1,
        "promptTime": "09:00",
        "timezone": "UTC"
    })
    
    # Add member to team
    await test_db.team_membership.create({
        "teamId": team.id,
        "userId": member.id,
        "status": "ACTIVE"
    })
    
    # Test cases:
    # 1. Manager can view member's info
    manager_token = create_access_token({"sub": manager.id, "role": "MANAGER"})
    response = await client.get(
        f"/api/v1/users/{member.id}",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Test Member"
    
    # 2. Member can view their own info
    member_token = create_access_token({"sub": member.id, "role": "MEMBER"})
    response = await client.get(
        f"/api/v1/users/{member.id}",
        headers={"Authorization": f"Bearer {member_token}"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Test Member"
    
    # 3. Member cannot view other member's info
    other_member = await test_db.user.create({
        "email": "other@test.com",
        "name": "Other Member",
        "role": "MEMBER"
    })
    response = await client.get(
        f"/api/v1/users/{other_member.id}",
        headers={"Authorization": f"Bearer {member_token}"}
    )
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_get_user_not_found(app: FastAPI, client: AsyncClient, test_db):
    # Create a test user
    user = await test_db.user.create({
        "email": "test@test.com",
        "name": "Test User",
        "role": "MEMBER"
    })
    
    token = create_access_token({"sub": user.id, "role": "MEMBER"})
    response = await client.get(
        "/api/v1/users/non-existent-id",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404 