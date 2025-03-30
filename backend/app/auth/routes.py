from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from prisma import Prisma
from .dependencies import get_prisma, get_current_user
from .schemas import Token, UserLogin, UserResponse, RefreshToken
from .utils import verify_password, create_access_token, create_refresh_token
from .rate_limiter import login_rate_limiter

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    prisma: Prisma = Depends(get_prisma),
    _: None = Depends(login_rate_limiter)
):
    # Find user by email
    user = await prisma.user.find_unique(where={"email": form_data.username})
    if not user or not user.passwordHash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(form_data.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_token
    )

@router.post("/token", response_model=Token)
async def refresh_token(
    token_data: RefreshToken,
    prisma: Prisma = Depends(get_prisma)
):
    try:
        # Verify refresh token and get user ID
        from jose import jwt
        from .config import auth_config
        payload = jwt.decode(
            token_data.refresh_token,
            auth_config.SECRET_KEY,
            algorithms=[auth_config.ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Check token type
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Create new tokens
        access_token = create_access_token(user_id)
        refresh_token = create_refresh_token(user_id)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            refresh_token=refresh_token
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.post("/logout")
async def logout(current_user = Depends(get_current_user)):
    # In a more complex implementation, we could blacklist the token
    # For now, we'll just return success as the client should delete the tokens
    return {"message": "Successfully logged out"} 