from datetime import datetime, timedelta, UTC
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma
from jose import jwt, JWTError, ExpiredSignatureError # Import specific errors
from .dependencies import get_prisma
from .config import auth_config
from .utils import create_token
from .schemas import Token

router = APIRouter(prefix="/api/v1/magic-links", tags=["magic-links"])

MAGIC_LINK_EXPIRE = timedelta(hours=72)

def create_magic_link_token(user_id: str, team_id: str) -> str:
    """Create a magic link token that expires in 72 hours"""
    return create_token(
        data={
            "sub": user_id,
            "team_id": team_id,
            "type": "magic-link"
        },
        expires_delta=MAGIC_LINK_EXPIRE
    )

@router.post("/{team_id}/{user_email}")
async def create_magic_link(
    team_id: str,
    user_email: str,
    prisma: Prisma = Depends(get_prisma)
):
    """Create a magic link for a team member"""
    # Find or create user
    user = await prisma.user.find_first(where={"email": user_email})
    if not user:
        user = await prisma.user.create({
            "email": user_email,
            "role": "MEMBER",
            "name": user_email.split("@")[0]  # Default name from email
        })

    # Verify team membership
    team_member = await prisma.team_membership.find_first(
        where={
            "teamId": team_id,
            "userId": user.id,
            "status": "ACTIVE"
        }
    )
    
    if not team_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in team"
        )
    
    # Create magic link token
    token = create_magic_link_token(user.id, team_id)
    
    # In a real implementation, we would send this link via email
    # For now, we'll just return it
    magic_link = f"{auth_config.BASE_URL}/submit?token={token}"
    
    return {"magic_link": magic_link}

@router.get("/{token}")
async def verify_magic_link(
    token: str,
    prisma: Prisma = Depends(get_prisma)
):
    """Verify a magic link token"""
    try:
        # Verify the token signature, expiration, and claims
        payload = jwt.decode(
            token,
            auth_config.SECRET_KEY,
            algorithms=[auth_config.ALGORITHM]
        )
        
        token_type = payload.get("type")
        user_id = payload.get("sub")
        team_id = payload.get("team_id")

        if token_type != "magic-link":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        
        if not user_id or not team_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        
        # Verify user exists and is still an active member of the team
        user = await prisma.user.find_first(
            where={
                "id": user_id,
                "teams": {
                    "some": {
                        "teamId": team_id,
                        "status": "ACTIVE"
                    }
                }
            }
        )
        
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User or team membership not valid")
        
        # Create a short-lived access token for the submission
        access_token = create_token(
            data={"sub": user_id, "team_id": team_id, "type": "access"},
            expires_delta=timedelta(minutes=30)  # Short-lived token for submission
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer"
        )
        
    except ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Magic link has expired")
    except JWTError as e:
        # Catches other JWT errors like invalid signature, invalid claims, etc.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid magic link token: {e}")
    except HTTPException as e:
        # Re-raise HTTPExceptions raised within the try block (like 404)
        raise e
    except Exception as e:
        # Catch any other unexpected errors
        print(f"Unexpected error during magic link verification: {e}") # Log for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error during verification") 