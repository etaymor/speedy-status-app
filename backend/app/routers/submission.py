from fastapi import APIRouter, Depends, HTTPException, status, Request
from prisma import Prisma
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import Optional
from ..auth.dependencies import get_prisma
from ..auth.utils import decode_token

router = APIRouter(prefix="/api/v1/submissions", tags=["submissions"])

class SubmissionCreate(BaseModel):
    content: str
    team_id: str
    user_id: str

class SubmissionResponse(BaseModel):
    id: str
    content: str
    submitted_at: datetime
    is_late: bool
    week_start_date: datetime

@router.post("", response_model=SubmissionResponse)
async def create_submission(
    submission: SubmissionCreate,
    request: Request,
    prisma: Prisma = Depends(get_prisma)
):
    """Create a new submission for a team member."""
    try:
        # Get token from Authorization header
        token = request.headers.get("Authorization")
        if not token or not token.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )
        token = token.split("Bearer ")[1]
        
        # Verify token and extract user/team info
        token_data = decode_token(token)
        if token_data.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Get team's schedule
        team = await prisma.team.find_unique(
            where={"id": submission.team_id}
        )
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found"
            )
        
        # Verify user is part of team
        team_member = await prisma.teammembership.find_first(
            where={
                "userId": token_data["sub"],
                "teamId": submission.team_id,
                "status": {"in": ["ACTIVE", "PENDING"]}  # Allow PENDING members to submit
            }
        )
        
        if not team_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a member of this team"
            )

        # If member is PENDING, upgrade to ACTIVE
        if team_member.status == "PENDING":
            await prisma.teammembership.update(
                where={"id": team_member.id},
                data={"status": "ACTIVE"}
            )
        
        # Get the most recent scheduled prompt time
        scheduled_prompt = await prisma.scheduledpromptjob.find_first(
            where={
                "teamId": team.id,
                "status": "SENT"
            },
            order={
                "scheduledFor": "desc"
            }
        )
        
        if not scheduled_prompt:
            # Create a default prompt for first-time submissions
            now = datetime.now(timezone.utc)
            scheduled_prompt = await prisma.scheduledpromptjob.create(
                data={
                    "teamId": team.id,
                    "scheduledFor": now,
                    "status": "SENT",
                    "channel": ["EMAIL"]
                }
            )
        
        # Check if submission is late (24 hours after prompt)
        now = datetime.now(timezone.utc)
        prompt_time = scheduled_prompt.scheduledFor.replace(tzinfo=timezone.utc) if scheduled_prompt.scheduledFor.tzinfo is None else scheduled_prompt.scheduledFor
        is_late = now > (prompt_time + timedelta(hours=24))
        
        # Create submission
        submission = await prisma.submission.create(
            data={
                "userId": token_data["sub"],
                "teamId": submission.team_id,
                "content": submission.content,
                "weekStartDate": datetime.combine(prompt_time.date(), datetime.min.time()).replace(tzinfo=timezone.utc),
                "isLate": is_late
            }
        )
        
        return SubmissionResponse(
            id=submission.id,
            content=submission.content,
            submitted_at=submission.submittedAt,
            is_late=submission.isLate,
            week_start_date=submission.weekStartDate
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create submission: {str(e)}"
        ) 