from fastapi import APIRouter, Depends, HTTPException
from ..auth.dependencies import get_current_user, get_prisma
from ..auth.schemas import UserResponse
from prisma import Prisma
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/users")

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user = Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma)
):
    """Get user information by ID."""
    logger.info(f"Fetching user data for ID: {user_id}")
    logger.info(f"Current user making request: {current_user.id} (role: {current_user.role})")
    
    try:
        # Find requested user
        user = await prisma.user.find_first(where={"id": user_id})
        if not user:
            logger.error(f"User not found with ID: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Found user: {user.id} (role: {user.role})")
        
        # Users can always access their own data
        if current_user.id == user_id:
            logger.info("User accessing their own data - authorized")
            return UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role
            )

        # Check if users are in the same team
        logger.info("Checking team membership...")
        team_membership = await prisma.teammembership.find_first(
            where={
                "AND": [
                    # The requested user's team membership
                    {
                        "userId": user_id,
                        "status": "ACTIVE"
                    },
                    # Current user's team membership in the same team
                    {
                        "team": {
                            "members": {
                                "some": {
                                    "userId": current_user.id,
                                    "status": "ACTIVE"
                                }
                            }
                        }
                    }
                ]
            }
        )

        if not team_membership:
            logger.error(f"Team membership not found or not active for user {user_id}")
            raise HTTPException(
                status_code=403,
                detail="Not authorized to view this user's information"
            )
        
        logger.info("Team membership verified - returning user data")
        return UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Unexpected error in get_user: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching user data"
        ) 