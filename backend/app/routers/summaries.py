from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timedelta
from ..auth.oauth2 import get_current_user
from ..services.summary_service import summary_service
from ..database import prisma
from prisma.models import User, WeeklySummary
from prisma.enums import TriggerType

router = APIRouter(prefix="/api/v1/summaries", tags=["summaries"])

@router.post("/{team_id}/generate")
async def generate_summary(
    team_id: str,
    week_start_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user)
) -> WeeklySummary:
    """
    Generate a summary for a team manually.
    If week_start_date is not provided, uses the current week.
    """
    # Verify team access
    team = await prisma.team.find_first(
        where={
            'id': team_id,
            'managerId': current_user.id
        }
    )
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found or access denied")
    
    # Use current week if date not provided
    if not week_start_date:
        today = datetime.now()
        week_start_date = today - timedelta(days=today.weekday())
        week_start_date = week_start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Generate summary
    try:
        summary = await summary_service.generate_summary(
            team_id=team_id,
            week_start_date=week_start_date,
            trigger_type=TriggerType.MANUAL
        )
        return summary
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate summary")

@router.get("/{team_id}")
async def get_team_summaries(
    team_id: str,
    current_user: User = Depends(get_current_user)
) -> list[WeeklySummary]:
    """Get all summaries for a team."""
    # Verify team access
    team = await prisma.team.find_first(
        where={
            'id': team_id,
            'OR': [
                {'managerId': current_user.id},
                {'members': {'some': {'userId': current_user.id, 'status': 'ACTIVE'}}}
            ]
        }
    )
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found or access denied")
    
    # Get summaries
    summaries = await prisma.weeklysummary.find_many(
        where={'teamId': team_id},
        order={'weekStartDate': 'desc'}
    )
    
    return summaries

@router.get("/{team_id}/{week_start_date}")
async def get_team_summary(
    team_id: str,
    week_start_date: datetime,
    current_user: User = Depends(get_current_user)
) -> WeeklySummary:
    """Get a specific week's summary for a team."""
    # Verify team access
    team = await prisma.team.find_first(
        where={
            'id': team_id,
            'OR': [
                {'managerId': current_user.id},
                {'members': {'some': {'userId': current_user.id, 'status': 'ACTIVE'}}}
            ]
        }
    )
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found or access denied")
    
    # Get summary
    summary = await prisma.weeklysummary.find_unique(
        where={
            'teamId_weekStartDate': {
                'teamId': team_id,
                'weekStartDate': week_start_date
            }
        }
    )
    
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    
    return summary 