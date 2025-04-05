import time
from typing import List
import os
import asyncio
import logging
from openai import AsyncOpenAI, version
import httpx
from ..config import get_settings
from datetime import datetime
from prisma.models import Submission

settings = get_settings()
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        """Initialize the AI service with OpenAI client."""
        logger.debug(f"OpenAI Version: {version}")
        logger.debug(f"HTTPX Version: {httpx.__version__}")
        logger.debug(f"Proxy Environment Variables: HTTP_PROXY={os.getenv('HTTP_PROXY')}, HTTPS_PROXY={os.getenv('HTTPS_PROXY')}")
        
        try:
            # Create custom HTTP client without proxy settings
            http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(60.0),
                follow_redirects=True
            )
            
            self.client = AsyncOpenAI(
                api_key=settings.openai_api_key,
                http_client=http_client
            )
            logger.debug("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing OpenAI client: {str(e)}")
            raise
            
        self.model = "gpt-4o-mini"
        self.max_retries = 3
        self.retry_delay = 1  # seconds

    def _format_submissions(self, submissions: List[Submission]) -> str:
        """Format submissions for the prompt."""
        formatted = []
        for sub in submissions:
            formatted.append(f"Team Member: {sub.user.name}\nUpdate: {sub.content}\n")
        return "\n".join(formatted)

    async def generate_team_summary(self, submissions: List[Submission]) -> str:
        """Generate a team summary from member submissions."""
        system_prompt = """
        You are a professional team manager summarizing weekly updates.
        Write a business-casual summary at a high school reading level.
        Format the summary with:
        1. A one-paragraph overview of key themes and progress
        2. A bulleted list of specific highlights or important points
        Keep the tone positive and forward-looking.
        """

        user_prompt = f"""
        Here are the team's weekly updates:

        {self._format_submissions(submissions)}

        Please provide a summary of the team's progress and upcoming work.
        """

        retries = 0
        while retries < self.max_retries:
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.7
                )
                return response.choices[0].message.content
            except Exception as e:
                retries += 1
                if retries == self.max_retries:
                    raise e
                await asyncio.sleep(self.retry_delay * retries)

# Create a singleton instance
ai_service = AIService() 