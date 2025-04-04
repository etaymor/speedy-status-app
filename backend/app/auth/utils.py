from datetime import datetime, timedelta, UTC
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from .config import auth_config, ACCESS_TOKEN_EXPIRE, REFRESH_TOKEN_EXPIRE

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, auth_config.SECRET_KEY, algorithm=auth_config.ALGORITHM
    )
    return encoded_jwt

def create_access_token(user_id: str) -> str:
    return create_token(
        data={"sub": user_id, "type": "access"},
        expires_delta=ACCESS_TOKEN_EXPIRE
    )

def create_refresh_token(user_id: str) -> str:
    return create_token(
        data={"sub": user_id, "type": "refresh"},
        expires_delta=REFRESH_TOKEN_EXPIRE
    ) 