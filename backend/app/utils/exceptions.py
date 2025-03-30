from fastapi import HTTPException

class TeamError(HTTPException):
    """Custom exception for team-related errors."""
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail) 