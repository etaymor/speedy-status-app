# Speedy Status Implementation Details

## Authentication System

### Overview

The authentication system uses a dual-approach strategy:

1. OAuth2 with JWT for manager authentication
2. Magic links for team member authentication

### Manager Authentication

- Uses FastAPI's OAuth2 with Password flow
- JWT tokens with two types:
  - Access tokens (30-minute expiry)
  - Refresh tokens (7-day expiry)
- Rate limiting implemented using Redis (5 attempts per 5 minutes)

```python
# Key configuration (auth_config.py)
SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-jwt")
ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
REFRESH_TOKEN_EXPIRE_DAYS: int = 7
ALGORITHM: str = "HS256"
```

### Magic Link System

- Uses JWT tokens with 72-hour expiry
- No refresh tokens for magic links
- Two-step process:
  1. Create magic link: POST `/api/v1/magic-links/{team_id}/{user_email}`
  2. Verify and use: GET `/api/v1/magic-links/{token}`

```python
# Magic link token structure
{
    "sub": "user_id",
    "team_id": "team_id",
    "type": "magic-link",
    "exp": "expiry_timestamp"
}
```

### Token Types

1. Access Token

   - Used for API authentication
   - 30-minute expiry
   - Contains user ID and type

2. Refresh Token

   - Used to obtain new access tokens
   - 7-day expiry
   - Only for manager authentication

3. Magic Link Token
   - Used for team member submissions
   - 72-hour expiry
   - Contains both user and team IDs

## Database Models (Prisma)

### User Model

```prisma
model User {
    id              String           @id @default(uuid())
    email           String           @unique
    role            UserRole
    name            String
    passwordHash    String?          @map("password_hash")
    authProviderId  String?          @map("auth_provider_id")
    createdAt       DateTime         @default(now())
    lastActiveAt    DateTime         @updatedAt
    teams           TeamMembership[]
    submissions     Submission[]
}

enum UserRole {
    MANAGER
    MEMBER
}
```

### Team Model

```prisma
model Team {
    id          String           @id @default(uuid())
    name        String
    managerId   String          @map("manager_id")
    promptDay   Int             @map("prompt_day")
    promptTime  String          @map("prompt_time")
    timezone    String
    createdAt   DateTime        @default(now())
    isDeleted   Boolean         @default(false)
    members     TeamMembership[]
    submissions Submission[]
}
```

### TeamMembership Model

```prisma
model TeamMembership {
    id        String           @id @default(uuid())
    teamId    String          @map("team_id")
    userId    String          @map("user_id")
    status    MembershipStatus
    team      Team            @relation(fields: [teamId], references: [id])
    user      User            @relation(fields: [userId], references: [id])
}

enum MembershipStatus {
    ACTIVE
    REMOVED
}
```

## Security Considerations

### Rate Limiting

- Login attempts limited to 5 per 5 minutes
- Uses Redis for rate limit tracking
- Configurable through environment variables:
  ```python
  LOGIN_RATE_LIMIT: int = 5
  LOGIN_RATE_LIMIT_PERIOD: int = 300  # seconds
  ```

### Password Security

- Passwords hashed using bcrypt
- No plaintext passwords stored
- Optional auth provider ID for future OAuth integrations

### Token Security

- All tokens are JWT-based
- Different expiry times for different token types
- Tokens include type field to prevent token reuse
- Magic links are single-use and team-specific

## Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/speedy_status_db"

# Authentication
SECRET_KEY="your-secure-secret-key"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Rate Limiting
REDIS_URL="redis://localhost:6379"
LOGIN_RATE_LIMIT=5
LOGIN_RATE_LIMIT_PERIOD=300

# Application
BASE_URL="http://localhost:3000"  # Frontend URL for magic links
```

## Testing

- Comprehensive test suite for authentication flows
- Test coverage includes:
  - Manager login/refresh flow
  - Magic link creation and verification
  - Rate limiting functionality
  - Invalid token handling
  - Team membership verification

## Future Considerations

1. Email Integration

   - Implement email sending for magic links
   - Add email templates for different notifications

2. Token Blacklisting

   - Consider implementing token blacklisting for logout
   - Use Redis to store blacklisted tokens

3. Enhanced Security

   - Add IP-based rate limiting
   - Implement progressive delays for failed attempts
   - Add audit logging for authentication events

4. Monitoring
   - Add authentication failure monitoring
   - Track magic link usage patterns
   - Monitor rate limit hits
