import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
from prisma.enums import TriggerType, MembershipStatus
from app.services.summary_service import SummaryService
from app.services.ai_service import ai_service
from zoneinfo import ZoneInfo
from app.models.trigger_type import TriggerType

def _to_dict(obj):
    """Convert Prisma model to dictionary."""
    if hasattr(obj, 'dict'):
        return obj.dict()
    elif isinstance(obj, list):
        return [_to_dict(item) for item in obj]
    return obj

@pytest.mark.asyncio
async def test_should_generate_summary_all_submitted(test_submissions, test_members):
    submissions, delete_funcs = test_submissions
    submissions_dict = _to_dict(submissions)
    members_dict = [{"id": member.id, "email": member.email} for member in test_members]

    service = SummaryService()
    should_generate = await service.should_generate_summary(members_dict, submissions_dict)
    assert should_generate is True

@pytest.mark.asyncio
async def test_should_generate_summary_timeout(test_submissions, test_members):
    submissions, delete_funcs = test_submissions
    # Set submission time to more than 24 hours ago
    for submission in submissions:
        submission.submittedAt = datetime.now(timezone.utc) - timedelta(hours=25)
    
    submissions_dict = _to_dict(submissions)
    members_dict = [{"id": member.id, "email": member.email} for member in test_members]

    service = SummaryService()
    should_generate = await service.should_generate_summary(members_dict, submissions_dict)
    assert should_generate is True

@pytest.mark.asyncio
async def test_should_not_generate_summary_incomplete(test_submissions, test_members):
    submissions, delete_funcs = test_submissions
    # Remove one submission to make it incomplete
    submissions.pop()
    
    submissions_dict = _to_dict(submissions)
    members_dict = [{"id": member.id, "email": member.email} for member in test_members]

    service = SummaryService()
    should_generate = await service.should_generate_summary(members_dict, submissions_dict)
    assert should_generate is False

@pytest.mark.asyncio
async def test_generate_summary_new(test_submissions, test_team, prisma_client):
    submissions, delete_funcs = test_submissions
    submissions_dict = _to_dict(submissions)
    mock_summary = "Team has made good progress this week."
    
    with patch('app.services.ai_service.AIService.generate_team_summary') as mock_generate:
        mock_generate.return_value = mock_summary
        
        service = SummaryService()
        summary = await service.generate_summary(test_team.id, submissions_dict, TriggerType.ALL_SUBMITTED)
        
        assert summary.summaryText == mock_summary
        assert summary.teamId == test_team.id
        assert isinstance(summary.weekStartDate, datetime)
        assert summary.triggerType == TriggerType.ALL_SUBMITTED

@pytest.mark.asyncio
async def test_generate_summary_update_existing(test_submissions, test_team, prisma_client):
    submissions, delete_funcs = test_submissions
    submissions_dict = _to_dict(submissions)
    mock_summary = "Updated team progress summary."
    
    # Create an existing summary
    week_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    existing = await prisma_client.weeklysummary.create(
        data={
            'teamId': test_team.id,
            'summaryText': "Original summary",
            'weekStartDate': week_start,
            'triggerType': TriggerType.ALL_SUBMITTED
        }
    )
    
    with patch('app.services.ai_service.AIService.generate_team_summary') as mock_generate:
        mock_generate.return_value = mock_summary
        
        service = SummaryService()
        summary = await service.generate_summary(test_team.id, submissions_dict, TriggerType.TIMEOUT)
        
        assert summary.id == existing.id
        assert summary.summaryText == mock_summary
        
    # Cleanup
    await prisma_client.weeklysummary.delete(where={'id': existing.id})

@pytest.mark.asyncio
async def test_check_and_generate_if_needed(test_submissions, test_team, test_members):
    submissions, delete_funcs = test_submissions
    mock_summary = "Weekly team progress summary."
    members_dict = [{"id": member.id, "email": member.email} for member in test_members]
    
    with patch('app.services.ai_service.AIService.generate_team_summary') as mock_generate:
        mock_generate.return_value = mock_summary
        
        service = SummaryService()
        summary = await service.check_and_generate_if_needed(test_team.id, members_dict)
        
        assert summary is not None
        assert summary.summaryText == mock_summary
        assert summary.teamId == test_team.id
        assert summary.triggerType == TriggerType.ALL_SUBMITTED 