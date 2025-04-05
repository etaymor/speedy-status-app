from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from prisma.models import Team, Submission, WeeklySummary, User
from prisma.enums import TriggerType
from ..database import prisma
from .ai_service import ai_service

class SummaryService:
    @staticmethod
    async def should_generate_summary(members: List[Dict[str, str]], submissions: List[Dict[str, Any]]) -> bool:
        """Check if we should generate a summary based on conditions."""
        if not members or not submissions:
            return False

        # All members submitted
        if len(submissions) >= len(members):
            return True
            
        # Check if 24 hours have passed since any submission
        oldest_submission = min(submissions, key=lambda s: s['submittedAt'])
        if datetime.now(timezone.utc) > oldest_submission['submittedAt'] + timedelta(hours=24):
            return True
            
        return False

    @staticmethod
    async def generate_summary(team_id: str, submissions: List[Dict[str, Any]], trigger_type: TriggerType) -> WeeklySummary:
        """Generate and save a summary for the team's submissions."""
        # Get team
        team = await prisma.team.find_unique(
            where={'id': team_id}
        )
        
        if not team:
            raise ValueError("Team not found")

        if not submissions:
            raise ValueError("No submissions provided")

        # Get the week start date from the first submission
        week_start_date = submissions[0]['weekStartDate']

        # Generate summary using AI service
        summary_text = await ai_service.generate_team_summary(
            submissions=submissions,
            team_name=team.name
        )

        # Find existing summary
        existing_summary = await prisma.weeklysummary.find_first(
            where={
                'teamId': team_id,
                'weekStartDate': week_start_date
            }
        )

        if existing_summary:
            # Update existing summary
            summary = await prisma.weeklysummary.update(
                where={'id': existing_summary.id},
                data={
                    'summaryText': summary_text,
                    'triggerType': trigger_type,
                    'updatedAt': datetime.now()
                }
            )
        else:
            # Create new summary
            summary = await prisma.weeklysummary.create(
                data={
                    'teamId': team_id,
                    'weekStartDate': week_start_date,
                    'summaryText': summary_text,
                    'triggerType': trigger_type
                }
            )

        return summary

    @staticmethod
    async def check_and_generate_if_needed(team_id: str, members: List[Dict[str, str]]) -> Optional[WeeklySummary]:
        """Check conditions and generate summary if needed."""
        # Get submissions for the team
        week_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        submissions = await prisma.submission.find_many(
            where={
                'teamId': team_id,
                'weekStartDate': week_start
            }
        )

        submissions_dict = [s.dict() for s in submissions]
        should_generate = await SummaryService.should_generate_summary(members, submissions_dict)
        
        if should_generate:
            trigger_type = (
                TriggerType.ALL_SUBMITTED 
                if len(submissions) >= len(members) 
                else TriggerType.TIMEOUT
            )
            return await SummaryService.generate_summary(team_id, submissions_dict, trigger_type)
        
        return None

# Create a singleton instance
summary_service = SummaryService() 