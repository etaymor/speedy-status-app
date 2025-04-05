from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr, validator
import pytz
from zoneinfo import ZoneInfo, available_timezones
import logging

from ..auth.dependencies import get_current_manager, get_current_user, get_prisma
from ..database import prisma
from ..utils.exceptions import TeamError

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

router = APIRouter(prefix="/api/v1/teams", tags=["teams"])

# Response Models
class TeamResponse(BaseModel):
    id: str
    name: str
    promptDay: int
    promptTime: str
    timezone: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str

class SubmissionResponse(BaseModel):
    id: str
    content: str
    submittedAt: datetime
    isLate: bool

class MemberSubmissionResponse(BaseModel):
    user: UserResponse
    hasSubmitted: bool
    submission: Optional[SubmissionResponse] = None

class SummaryResponse(BaseModel):
    id: str
    summaryText: str
    generatedAt: datetime
    triggerType: str

class CurrentWeekResponse(BaseModel):
    startDate: datetime
    memberSubmissions: List[MemberSubmissionResponse]
    submissionCount: int
    totalMembers: int
    summary: Optional[SummaryResponse] = None

class HistoricalDataResponse(BaseModel):
    weekStartDate: datetime
    submissionCount: int
    totalMembers: int
    submissionRate: float
    hasSummary: bool

class TeamDashboardResponse(BaseModel):
    team: TeamResponse
    isManager: bool
    currentWeek: CurrentWeekResponse
    historicalData: List[HistoricalDataResponse]

    class Config:
        from_attributes = True

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
    
    if team.managerId != current_user_id:
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
                "managerId": current_user.id,
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

@router.get("")
async def get_teams(current_user = Depends(get_current_user)):
    """Get all teams for the current user."""
    try:
        teams = await prisma.team.find_many(
            where={
                "OR": [
                    {"managerId": current_user.id},
                    {
                        "members": {
                            "some": {
                                "userId": current_user.id
                            }
                        }
                    }
                ]
            }
        )
        return teams
    except Exception as e:
        raise TeamError(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch teams: {str(e)}"
        )

@router.get("/{team_id}/dashboard", response_model=TeamDashboardResponse)
async def get_team_dashboard(
    team_id: str,
    current_user = Depends(get_current_user),
    prisma = Depends(get_prisma)
):
    """Get dashboard data for a team, including members, submissions, and summary."""
    try:
        logger.debug(f"Fetching dashboard data for team {team_id}")
        logger.debug(f"Current user: {current_user.__dict__}")
        
        # Validate team access
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
        
        logger.debug(f"Raw team data from Prisma: {team}")
        logger.debug(f"Team attributes: {dir(team)}")
        
        if not team:
            logger.error(f"Team not found: {team_id}")
            raise TeamError(status_code=404, detail="Team not found")

        # Check if user is the manager or a member of the team
        is_manager = team.managerId == current_user.id
        is_member = any(member.userId == current_user.id for member in team.members)
        
        logger.debug(f"Access check - is_manager: {is_manager}, is_member: {is_member}")
        
        if not (is_manager or is_member):
            logger.error(f"User {current_user.id} not authorized to view team {team_id}")
            raise TeamError(status_code=403, detail="Not authorized to view this team dashboard")
        
        # Get the most recent week's start date
        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        logger.debug(f"Week start date: {week_start}")
        
        # Get submissions for this week
        submissions = await prisma.submission.find_many(
            where={
                "teamId": team_id,
                "weekStartDate": week_start
            },
            include={"user": True}
        )
        
        logger.debug(f"Raw submissions data: {submissions}")
        
        # Track who has submitted
        member_submissions = {}
        for member in team.members:
            if member.status == "ACTIVE":
                member_submissions[member.userId] = {
                    "user": {
                        "id": member.user.id,
                        "name": member.user.name,
                        "email": member.user.email
                    },
                    "hasSubmitted": False,
                    "submission": None
                }
        
        logger.debug(f"Member submissions dict: {member_submissions}")
        
        for submission in submissions:
            logger.debug(f"Processing submission: {submission.__dict__}")
            if submission.userId in member_submissions:
                try:
                    member_submissions[submission.userId]["hasSubmitted"] = True
                    member_submissions[submission.userId]["submission"] = {
                        "id": submission.id,
                        "content": submission.content,
                        "submittedAt": submission.submittedAt,
                        "isLate": submission.isLate
                    }
                except Exception as e:
                    logger.error(f"Error processing submission {submission.id}: {str(e)}")
                    raise
        
        # Get the latest summary
        logger.debug("Attempting to fetch weekly summary")
        
        summaries = await prisma.weeklysummary.find_many(
            where={
                "teamId": team_id,
                "weekStartDate": week_start
            },
            order={
                "generatedAt": "desc"
            },
            take=1
        )
        
        summary = summaries[0] if summaries else None
        logger.debug(f"Weekly summary data: {summary}")
        
        # Convert the summary to a frontend-friendly format
        summary_data = None
        if summary:
            try:
                summary_data = {
                    "id": summary.id,
                    "summaryText": summary.summaryText,
                    "generatedAt": summary.generatedAt,
                    "triggerType": summary.triggerType
                }
            except Exception as e:
                logger.error(f"Error processing summary {summary.id}: {str(e)}")
                raise
        
        # Get last 4 weeks of submission data
        historical_data = []
        for i in range(4):
            try:
                past_week_start = week_start - timedelta(days=7 * i)
                past_week_submissions = await prisma.submission.find_many(
                    where={
                        "teamId": team_id,
                        "weekStartDate": past_week_start
                    }
                )
                
                past_week_summary = await prisma.weeklysummary.find_first(
                    where={
                        "teamId": team_id,
                        "weekStartDate": past_week_start
                    }
                )
                
                total_members = sum(1 for member in team.members if member.status == "ACTIVE")
                submission_rate = len(past_week_submissions) / total_members if total_members > 0 else 0
                
                historical_data.append({
                    "weekStartDate": past_week_start,
                    "submissionCount": len(past_week_submissions),
                    "totalMembers": total_members,
                    "submissionRate": submission_rate,
                    "hasSummary": past_week_summary is not None
                })
            except Exception as e:
                logger.error(f"Error processing historical data for week {past_week_start}: {str(e)}")
                raise
        
        logger.debug("Preparing response")
        try:
            response = TeamDashboardResponse(
                team=TeamResponse(
                    id=team.id,
                    name=team.name,
                    promptDay=team.promptDay,
                    promptTime=team.promptTime,
                    timezone=team.timezone
                ),
                isManager=is_manager,
                currentWeek=CurrentWeekResponse(
                    startDate=week_start,
                    memberSubmissions=list(member_submissions.values()),
                    submissionCount=sum(1 for ms in member_submissions.values() if ms["hasSubmitted"]),
                    totalMembers=len([m for m in team.members if m.status == "ACTIVE"]),
                    summary=summary_data
                ),
                historicalData=historical_data
            )
            logger.debug("Response prepared successfully")
            return response
        except Exception as e:
            logger.error(f"Error creating response object: {str(e)}")
            raise
            
    except Exception as e:
        logger.error(f"Error in get_team_dashboard: {str(e)}", exc_info=True)
        if isinstance(e, TeamError):
            raise e
        raise TeamError(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard data: {str(e)}"
        )

@router.post("/{team_id}/resend-prompt")
async def resend_prompt(
    team_id: str,
    current_user = Depends(get_current_manager),
    prisma = Depends(get_prisma)
):
    """Resend prompt to team members who haven't submitted yet."""
    try:
        # Validate team access
        team = await validate_team_access(team_id, current_user.id)
        
        # Get the most recent week's start date
        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Get team members who haven't submitted
        team_with_members = await prisma.team.find_unique(
            where={"id": team_id},
            include={
                "members": {
                    "where": {"status": "ACTIVE"},
                    "include": {"user": True}
                }
            }
        )
        
        submissions = await prisma.submission.find_many(
            where={
                "teamId": team_id,
                "weekStartDate": week_start
            }
        )
        
        submitted_user_ids = [sub.userId for sub in submissions]
        non_responders = [
            member for member in team_with_members.members 
            if member.userId not in submitted_user_ids
        ]
        
        if not non_responders:
            return {"message": "All team members have already submitted"}
        
        # Create new scheduled prompt job
        scheduled_prompt = await prisma.scheduled_prompt_job.create(
            data={
                "teamId": team_id,
                "scheduledFor": datetime.now(),
                "status": "SENT",
                "channel": ["EMAIL"]
            }
        )
        
        # In a real implementation, this would send emails or other notifications
        # to the non-responders. For now, we'll just return who would receive prompts.
        return {
            "message": f"Prompts resent to {len(non_responders)} team members",
            "scheduled_prompt_id": scheduled_prompt.id,
            "non_responders": [
                {
                    "id": member.user.id,
                    "name": member.user.name,
                    "email": member.user.email
                }
                for member in non_responders
            ]
        }
    except Exception as e:
        if isinstance(e, TeamError):
            raise e
        raise TeamError(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend prompts: {str(e)}"
        ) 