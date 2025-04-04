from fastapi import APIRouter, Depends, HTTPException, status, Request
from prisma import Prisma
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import logging
from ..auth.dependencies import get_prisma
from ..auth.utils import decode_token
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/submissions", tags=["submissions"])

class SubmissionCreate(BaseModel):
    content: str
    team_id: str
    user_id: str

class SubmissionUpdate(BaseModel):
    content: str

class UserResponse(BaseModel):
    id: str
    name: str

class SubmissionResponse(BaseModel):
    id: str
    content: str
    submitted_at: datetime
    is_late: bool
    week_start_date: datetime
    user: Optional[UserResponse] = None

# Rate limit configuration: 5 submissions per minute
submission_rate_limit = RateLimiter(times=5, minutes=1)

@router.post("", response_model=SubmissionResponse, dependencies=[Depends(submission_rate_limit)])
async def create_submission(
    submission: SubmissionCreate,
    request: Request,
    prisma: Prisma = Depends(get_prisma)
):
    """Create a new submission for a team member."""
    try:
        logger.info(f"Processing submission request for team {submission.team_id}")
        
        # Get token from Authorization header
        token = request.headers.get("Authorization")
        if not token or not token.startswith("Bearer "):
            logger.error("Missing or invalid authorization header")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )
        token = token.split("Bearer ")[1]
        
        # Verify token and extract user/team info
        token_data = decode_token(token)
        logger.info(f"Token decoded successfully for user {token_data.get('sub')}")
        
        if token_data.get("type") != "access":
            logger.error(f"Invalid token type: {token_data.get('type')}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Get team's schedule
        team = await prisma.team.find_unique(
            where={"id": submission.team_id}
        )
        if not team:
            logger.error(f"Team not found: {submission.team_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found"
            )
        logger.info(f"Found team: {team.name}")
        
        # Verify user is part of team
        team_member = await prisma.teammembership.find_first(
            where={
                "userId": token_data["sub"],
                "teamId": submission.team_id,
                "status": {"in": ["ACTIVE", "PENDING"]}  # Allow PENDING members to submit
            }
        )
        
        if not team_member:
            logger.error(f"User {token_data['sub']} is not a member of team {submission.team_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a member of this team"
            )
        logger.info(f"Verified team membership (status: {team_member.status})")

        # If member is PENDING, upgrade to ACTIVE
        if team_member.status == "PENDING":
            logger.info(f"Upgrading user from PENDING to ACTIVE")
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
            logger.info("No previous prompt found, creating default prompt")
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
        logger.info(f"Submission lateness check: is_late={is_late}")
        
        # Create submission
        logger.info("Creating submission record")
        submission = await prisma.submission.create(
            data={
                "userId": token_data["sub"],
                "teamId": submission.team_id,
                "content": submission.content,
                "weekStartDate": datetime.combine(prompt_time.date(), datetime.min.time()).replace(tzinfo=timezone.utc),
                "isLate": is_late
            }
        )
        logger.info(f"Submission created successfully with ID: {submission.id}")
        
        return SubmissionResponse(
            id=submission.id,
            content=submission.content,
            submitted_at=submission.submittedAt,
            is_late=submission.isLate,
            week_start_date=submission.weekStartDate
        )
        
    except Exception as e:
        logger.error(f"Error creating submission: {str(e)}", exc_info=True)
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create submission: {str(e)}"
        )

# Rate limit configuration: 10 edits per minute
edit_rate_limit = RateLimiter(times=10, minutes=1)

@router.put("/{submission_id}", response_model=SubmissionResponse, dependencies=[Depends(edit_rate_limit)])
async def update_submission(
    submission_id: str,
    submission_update: SubmissionUpdate,
    request: Request,
    prisma: Prisma = Depends(get_prisma)
):
    """Update an existing submission."""
    try:
        logger.info(f"Processing submission update request for submission {submission_id}")
        
        # Get token from Authorization header
        token = request.headers.get("Authorization")
        if not token or not token.startswith("Bearer "):
            logger.error("Missing or invalid authorization header")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )
        token = token.split("Bearer ")[1]
        
        # Verify token and extract user info
        token_data = decode_token(token)
        logger.info(f"Token decoded successfully for user {token_data.get('sub')}")
        
        if token_data.get("type") != "access":
            logger.error(f"Invalid token type: {token_data.get('type')}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )

        # Get the submission
        submission = await prisma.submission.find_unique(
            where={"id": submission_id}
        )
        if not submission:
            logger.error(f"Submission not found: {submission_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )

        # Verify user owns the submission
        if submission.userId != token_data["sub"]:
            logger.error(f"User {token_data['sub']} is not the owner of submission {submission_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own submissions"
            )

        # Update submission
        logger.info("Updating submission record")
        updated_submission = await prisma.submission.update(
            where={"id": submission_id},
            data={
                "content": submission_update.content,
                "updatedAt": datetime.now(timezone.utc)
            }
        )
        logger.info(f"Submission updated successfully: {updated_submission.id}")
        
        return SubmissionResponse(
            id=updated_submission.id,
            content=updated_submission.content,
            submitted_at=updated_submission.submittedAt,
            is_late=updated_submission.isLate,
            week_start_date=updated_submission.weekStartDate
        )
        
    except Exception as e:
        logger.error(f"Error updating submission: {str(e)}", exc_info=True)
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update submission: {str(e)}"
        )

@router.get("/team/{team_id}", response_model=List[SubmissionResponse])
async def get_team_submissions(
    team_id: str,
    request: Request,
    prisma: Prisma = Depends(get_prisma)
):
    """Get all submissions for a team."""
    try:
        logger.info(f"Fetching submissions for team {team_id}")
        
        # Get token from Authorization header
        token = request.headers.get("Authorization")
        if not token or not token.startswith("Bearer "):
            logger.error("Missing or invalid authorization header")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )
        token = token.split("Bearer ")[1]
        
        # Verify token and extract user info
        token_data = decode_token(token)
        logger.info(f"Token decoded successfully for user {token_data.get('sub')}")
        
        if token_data.get("type") != "access":
            logger.error(f"Invalid token type: {token_data.get('type')}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )

        # Verify user is part of team
        team_member = await prisma.teammembership.find_first(
            where={
                "userId": token_data["sub"],
                "teamId": team_id,
                "status": {"in": ["ACTIVE", "PENDING"]}
            }
        )
        
        if not team_member:
            logger.error(f"User {token_data['sub']} is not a member of team {team_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a member of this team"
            )

        # Get team submissions with user information
        submissions = await prisma.submission.find_many(
            where={
                "teamId": team_id
            },
            include={
                "user": {
                    "select": {
                        "id": True,
                        "name": True
                    }
                }
            },
            order={
                "submittedAt": "desc"
            }
        )
        
        logger.info(f"Found {len(submissions)} submissions for team {team_id}")
        
        return [
            SubmissionResponse(
                id=submission.id,
                content=submission.content,
                submitted_at=submission.submittedAt,
                is_late=submission.isLate,
                week_start_date=submission.weekStartDate,
                user=UserResponse(
                    id=submission.user.id,
                    name=submission.user.name
                ) if submission.user else None
            )
            for submission in submissions
        ]
        
    except Exception as e:
        logger.error(f"Error fetching team submissions: {str(e)}", exc_info=True)
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch team submissions: {str(e)}"
        ) 