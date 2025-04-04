from fastapi import APIRouter, Depends
from prisma import Prisma
from ..auth.dependencies import get_prisma

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

@router.get("/users")
async def get_users(prisma: Prisma = Depends(get_prisma)):
    """Get all users with their team memberships"""
    users = await prisma.user.find_many(
        include={
            "teams": {
                "include": {
                    "team": True
                }
            }
        }
    )
    return users

@router.get("/teams")
async def get_teams(prisma: Prisma = Depends(get_prisma)):
    """Get all teams with their members"""
    teams = await prisma.team.find_many(
        include={
            "members": {
                "include": {
                    "user": True
                }
            }
        }
    )
    return teams

@router.get("/teams/{team_id}")
async def get_team(team_id: str, prisma: Prisma = Depends(get_prisma)):
    """Get a specific team with all its details"""
    team = await prisma.team.find_unique(
        where={"id": team_id},
        include={
            "members": {
                "include": {
                    "user": True
                }
            }
        }
    )
    return team 