from typing import Optional, List
from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None

class TokenData(BaseModel):
    user_id: str

class TeamMember(BaseModel):
    email: EmailStr
    fullName: str

class TeamData(BaseModel):
    name: str
    promptDay: int
    promptTime: str
    timezone: str
    members: List[TeamMember]

class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    team: TeamData

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str

class RefreshToken(BaseModel):
    refresh_token: str 