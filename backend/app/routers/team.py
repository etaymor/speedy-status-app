from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma
from typing import List, Dict
from datetime import datetime
from pydantic import BaseModel, EmailStr, validator
import pytz
from zoneinfo import ZoneInfo, available_timezones
from typing import Optional

from ..auth.dependencies import get_current_manager
from ..database import prisma
from ..utils.exceptions import TeamError

router = APIRouter(prefix="/api/v1/team", tags=["team"])

class TeamCreate(BaseModel):
    name: str
    prompt_day: int  # 0 = Monday, 6 = Sunday
    prompt_time: str  # Format: "HH:MM" in 24h format
    timezone: Optional[str] = "UTC"  # Optional timezone, defaults to UTC

    @validator('timezone')
    def validate_timezone(cls, v):
        try:
            ZoneInfo(v)
            return v
        except Exception:
            raise ValueError(f"Invalid timezone: {v}")

    @validator('prompt_time')
    def validate_time_format(cls, v):
        try:
            datetime.strptime(v, "%H:%M")
            return v
        except ValueError:
            raise ValueError("Time must be in HH:MM format")

class TeamMemberAdd(BaseModel):
    emails: List[EmailStr]

class TeamScheduleUpdate(BaseModel):
    prompt_day: int
    prompt_time: str
    timezone: Optional[str] = None

    @validator('timezone')
    def validate_timezone(cls, v):
        if v is None:
            return v
        try:
            ZoneInfo(v)
            return v
        except Exception:
            raise ValueError(f"Invalid timezone: {v}")

async def validate_team_access(team_id: str, current_user_id: str) -> Dict:
    """Validate team exists and user has access."""
    team = await prisma.team.find_unique(
        where={"id": team_id},
        include={"members": True}
    )
    
    if not team:
        raise TeamError(status_code=404, detail="Team not found")
    
    if team.manager_id != current_user_id:
        raise TeamError(status_code=403, detail="Not authorized to modify this team")
    
    return team

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_team(team_data: TeamCreate, current_user = Depends(get_current_manager)):
    """Create a new team with the current user as manager."""
    try:
        # Validate prompt_day
        if not 0 <= team_data.prompt_day <= 6:
            raise TeamError(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="prompt_day must be between 0 (Monday) and 6 (Sunday)"
            )

        # Create team with timezone
        team = await prisma.team.create({
            "data": {
                "name": team_data.name,
                "manager_id": current_user.id,
                "prompt_day": team_data.prompt_day,
                "prompt_time": team_data.prompt_time,
                "timezone": team_data.timezone,
            }
        })

        return team
    except Exception as e:
        if isinstance(e, TeamError):
            raise e
        raise TeamError(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create team: {str(e)}"
        )

@router.post("/members")
async def add_team_members(
    team_id: str,
    member_data: TeamMemberAdd,
    current_user = Depends(get_current_manager)
):
    """Add members to a team by email."""
    try:
        # Validate team access
        team = await validate_team_access(team_id, current_user.id)

        # Process each email
        results = []
        async with prisma.tx() as transaction:
            for email in member_data.emails:
                # Check if user exists, create if not
                user = await transaction.user.find_unique(where={"email": email})
                if not user:
                    user = await transaction.user.create({
                        "data": {
                            "email": email,
                            "role": "MEMBER",
                            "name": email.split("@")[0]  # Use email prefix as initial name
                        }
                    })

                # Add team membership if not already a member
                existing_membership = await transaction.teammembership.find_first(
                    where={
                        "team_id": team_id,
                        "user_id": user.id
                    }
                )

                if not existing_membership:
                    await transaction.teammembership.create({
                        "data": {
                            "team_id": team_id,
                            "user_id": user.id,
                            "status": "ACTIVE"
                        }
                    })
                    results.append({"email": email, "status": "added"})
                else:
                    results.append({"email": email, "status": "already_member"})

        return {"results": results}
    except Exception as e:
        if isinstance(e, TeamError):
            raise e
        raise TeamError(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add team members: {str(e)}"
        )

@router.put("/{team_id}/schedule")
async def update_team_schedule(
    team_id: str,
    schedule: TeamScheduleUpdate,
    current_user = Depends(get_current_manager)
):
    """Update a team's prompt schedule."""
    try:
        # Validate team access
        team = await validate_team_access(team_id, current_user.id)

        # Validate prompt_day
        if not 0 <= schedule.prompt_day <= 6:
            raise TeamError(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="prompt_day must be between 0 (Monday) and 6 (Sunday)"
            )

        # Prepare update data
        update_data = {
            "prompt_day": schedule.prompt_day,
            "prompt_time": schedule.prompt_time,
        }

        # Update timezone if provided
        if schedule.timezone:
            update_data["timezone"] = schedule.timezone

        # Update team schedule
        updated_team = await prisma.team.update(
            where={"id": team_id},
            data=update_data
        )

        return updated_team
    except Exception as e:
        if isinstance(e, TeamError):
            raise e
        raise TeamError(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update team schedule: {str(e)}"
        )

@router.get("/timezones")
async def list_timezones():
    """Get list of valid timezones."""
    try:
        return {"timezones": sorted(available_timezones())}
    except Exception as e:
        raise TeamError(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch timezones: {str(e)}"
        ) 