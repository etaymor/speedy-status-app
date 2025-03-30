import pytest
import pytest_asyncio
from prisma import Prisma

@pytest_asyncio.fixture
async def prisma():
    client = Prisma()
    await client.connect()
    
    try:
        yield client
    finally:
        await client.disconnect()

@pytest.mark.asyncio
async def test_create_and_query_user(prisma):
    # Create a test user
    test_user = await prisma.user.create(
        data={
            "email": "test@example.com",
            "name": "Test User",
            "role": "MANAGER"  # Using string enum value directly
        }
    )
    
    # Query the user back
    queried_user = await prisma.user.find_unique(
        where={"id": test_user.id}
    )
    
    # Verify the user was created correctly
    assert queried_user is not None
    assert queried_user.email == "test@example.com"
    assert queried_user.name == "Test User"
    assert queried_user.role == "MANAGER"
    
    # Clean up
    await prisma.user.delete(
        where={"id": test_user.id}
    ) 