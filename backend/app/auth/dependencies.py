from datetime import datetime
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from prisma import Prisma

from .config import auth_config
from .schemas import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=auth_config.TOKEN_URL)

async def get_prisma():
    client = Prisma()
    await client.connect()
    try:
        yield client
    finally:
        await client.disconnect()

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    prisma: Prisma = Depends(get_prisma)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, auth_config.SECRET_KEY, algorithms=[auth_config.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception
    
    user = await prisma.user.find_unique(where={"id": token_data.user_id})
    if user is None:
        raise credentials_exception
    return user

async def get_current_manager(current_user = Depends(get_current_user)):
    if current_user.role != "MANAGER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have manager privileges"
        )
    return current_user 