from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from prisma import Prisma
import logging
from .dependencies import get_prisma, get_current_user
from .schemas import Token, UserLogin, UserResponse, RefreshToken, UserRegistration
from .utils import verify_password, create_access_token, create_refresh_token, get_password_hash
from .rate_limiter import login_rate_limiter

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

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

@router.post("/register", response_model=Token)
async def register(
    request: Request,
    user_data: UserRegistration,
    prisma: Prisma = Depends(get_prisma)
):
    # Log request details
    logger.debug(f"Registration request received")
    logger.debug(f"Headers: {dict(request.headers)}")
    logger.debug(f"Method: {request.method}")
    logger.debug(f"URL: {request.url}")
    logger.debug(f"Request data: {user_data.dict()}")
    
    try:
        # Check if user already exists
        existing_user = await prisma.user.find_unique(where={"email": user_data.email})
        if existing_user:
            logger.warning(f"Attempt to register existing email: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        logger.debug("Starting transaction for user creation")
        async with prisma.tx() as transaction:
            try:
                # Create new user
                user = await transaction.user.create(data={
                    "email": user_data.email,
                    "passwordHash": get_password_hash(user_data.password),
                    "name": user_data.email.split("@")[0],
                    "role": "MANAGER"
                })
                logger.debug(f"Created user with ID: {user.id}")

                # Create team
                team = await transaction.team.create(data={
                    "name": user_data.team.name,
                    "managerId": user.id,
                    "promptDay": user_data.team.promptDay,
                    "promptTime": user_data.team.promptTime,
                    "timezone": user_data.team.timezone
                })
                logger.debug(f"Created team with ID: {team.id}")

                # Create team members
                for member in user_data.team.members:
                    member_user = await transaction.user.upsert(
                        where={"email": member.email},
                        data={
                            "create": {
                                "email": member.email,
                                "name": member.fullName,
                                "role": "MEMBER"
                            },
                            "update": {
                                "name": member.fullName
                            }
                        }
                    )
                    logger.debug(f"Created/Updated team member: {member_user.id}")

                    await transaction.teammembership.create(data={
                        "teamId": team.id,
                        "userId": member_user.id,
                        "status": "ACTIVE"
                    })
            except Exception as tx_error:
                logger.error(f"Transaction error: {str(tx_error)}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error creating user and team: {str(tx_error)}"
                )
        
        # Create tokens
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        logger.debug("Successfully created tokens")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            refresh_token=refresh_token
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during registration: {str(e)}"
        ) 