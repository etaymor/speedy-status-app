import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone
from app.services.ai_service import AIService

class Response:
    def __init__(self, content):
        self.choices = [type('Choice', (), {'message': type('Message', (), {'content': content})()})]

@pytest.mark.asyncio
async def test_generate_team_summary_success(test_submissions):
    submissions, delete_funcs = test_submissions
    mock_response = Response("Team has made good progress this week. Key achievements include implementing authentication system, building frontend components, and setting up the database infrastructure.")
    
    with patch('app.services.ai_service.AsyncOpenAI') as mock_openai:
        mock_chat = AsyncMock()
        mock_chat.completions.create.return_value = mock_response
        mock_openai.return_value.chat = mock_chat
        
        ai_service = AIService()
        summary = await ai_service.generate_team_summary(submissions)
        
        assert "good progress" in summary
        assert "authentication" in summary
        mock_chat.completions.create.assert_called_once()

@pytest.mark.asyncio
async def test_generate_team_summary_retry_on_rate_limit(test_submissions):
    submissions, delete_funcs = test_submissions
    mock_response = Response("Team has made good progress this week.")
    
    with patch('app.services.ai_service.AsyncOpenAI') as mock_openai:
        mock_chat = AsyncMock()
        mock_chat.completions.create.side_effect = [
            Exception("Rate limit exceeded"),
            mock_response
        ]
        mock_openai.return_value.chat = mock_chat
        
        ai_service = AIService()
        summary = await ai_service.generate_team_summary(submissions)
        
        assert "good progress" in summary
        assert mock_chat.completions.create.call_count == 2

@pytest.mark.asyncio
async def test_generate_team_summary_max_retries_exceeded(test_submissions):
    submissions, delete_funcs = test_submissions
    
    with patch('app.services.ai_service.AsyncOpenAI') as mock_openai:
        mock_chat = AsyncMock()
        mock_chat.completions.create.side_effect = Exception("Rate limit exceeded")
        mock_openai.return_value.chat = mock_chat
        
        ai_service = AIService()
        with pytest.raises(Exception) as exc_info:
            await ai_service.generate_team_summary(submissions)
        
        assert "Rate limit exceeded" in str(exc_info.value)
        assert mock_chat.completions.create.call_count == 3  # Default max retries

@pytest.mark.asyncio
async def test_format_submissions(test_submissions):
    submissions, delete_funcs = test_submissions
    ai_service = AIService()
    formatted = ai_service._format_submissions(submissions)
    assert "Team Member:" in formatted
    assert "Update:" in formatted
    for submission in submissions:
        assert submission.content in formatted 