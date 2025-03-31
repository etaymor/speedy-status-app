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

## Team Management System

### Overview

The team management system uses a RESTful API design with the following key features:

- Team creation and configuration
- Member management
- Schedule management with timezone support
- Transactional operations for data consistency

### Team Data Model

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

### API Endpoints

1. Team Creation

```python
POST /api/v1/team
{
    "name": str,
    "prompt_day": int,  # 0-6 (Monday-Sunday)
    "prompt_time": str, # "HH:MM" format
    "timezone": str     # IANA timezone format
}
```

2. Member Management

```python
POST /api/v1/team/members
{
    "team_id": str,
    "emails": List[str]
}
```

3. Schedule Updates

```python
PUT /api/v1/team/{team_id}/schedule
{
    "prompt_day": int,
    "prompt_time": str,
    "timezone": str
}
```

### Timezone Handling

- Uses IANA timezone database for standardization
- Stores local time + timezone rather than UTC
- Validates timezones using zoneinfo
- Automatically detects user's timezone in frontend
- Provides timezone selection with complete IANA timezone list

### Error Handling

Custom exception class for team-related errors:

```python
class TeamError(HTTPException):
    """Custom exception for team-related errors."""
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)
```

Error scenarios handled:

- Invalid timezone
- Invalid time format
- Invalid prompt day
- Unauthorized access
- Member addition failures
- Transaction failures

### Data Consistency

- Uses transactions for member addition operations
- Validates team access before operations
- Ensures atomic operations for data integrity
- Handles rollbacks on failure

### Frontend Components

Team setup form features:

- Timezone detection and selection
- Day/time picker with validation
- Bulk member addition via comma-separated emails
- Real-time validation
- Error feedback
- Loading states

### Testing Strategy

Comprehensive test suite covering:

```python
@pytest.mark.asyncio
async def test_create_team_success()
async def test_create_team_invalid_timezone()
async def test_add_team_members_success()
async def test_add_team_members_unauthorized()
async def test_update_schedule_success()
async def test_update_schedule_invalid_time()
async def test_list_timezones()
async def test_team_transaction_rollback()
```

Key test areas:

- Team creation validation
- Member addition scenarios
- Schedule update validation
- Timezone validation
- Transaction rollback
- Authorization checks

### Security Considerations

1. Authentication

   - Required for all team management endpoints
   - Manager-only access for team operations
   - Token-based authentication

2. Input Validation

   - Pydantic models for request validation
   - Custom validators for timezone and time format
   - Email format validation for member addition

3. Authorization
   - Team ownership verification
   - Operation-specific permission checks
   - Proper error responses for unauthorized access

### Performance Optimizations

1. Database Operations

   - Uses transactions for bulk operations
   - Efficient member lookup and addition
   - Proper indexing on frequently queried fields

2. Frontend Optimizations
   - Caches timezone list
   - Debounced form submissions
   - Optimistic UI updates

### Best Practices

1. Code Organization

   - Separate router for team operations
   - Custom exception handling
   - Reusable validation functions
   - Type hints throughout

2. API Design

   - RESTful endpoints
   - Consistent error responses
   - Clear validation messages
   - Proper HTTP status codes

3. Frontend Design
   - Responsive layout
   - Clear error messages
   - Loading states
   - User-friendly timezone selection

## Admin API

### Overview

The admin API provides endpoints for monitoring and managing the application data:

```python
# Key endpoints (admin.py)
GET /api/v1/admin/users    # Get all users with team memberships
GET /api/v1/admin/teams    # Get all teams with members
GET /api/v1/admin/teams/{team_id}  # Get specific team details
```

### Data Access

- Users endpoint includes:
  - Basic user information (id, email, role, name)
  - Creation and last active timestamps
  - Team membership details
- Teams endpoint includes:
  - Team configuration (name, prompt day/time, timezone)
  - Manager association
  - Member list with status

### Security Considerations

- Admin endpoints should be protected with appropriate authentication
- Consider implementing role-based access control
- Add rate limiting for admin endpoints
- Implement audit logging for admin actions

## Frontend Onboarding Flow

### Overview

The onboarding flow follows a multi-step process:

1. Account Creation

   - Manager registration with email/password
   - Basic information collection
   - Role assignment

2. Team Setup

   - Team name selection
   - Schedule configuration (day/time)
   - Timezone selection

3. Member Invitation
   - Bulk email addition
   - Magic link generation
   - Invitation status tracking

### Implementation Details

- Uses React Router for navigation
- Maintains state using React Context
- Implements form validation
- Handles timezone detection and selection
- Provides real-time feedback
- Manages loading and error states

### Environment Variables

Required environment variables (updated):

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
VITE_API_URL="http://localhost:7000"  # Backend API URL
BASE_URL="http://localhost:5173"      # Frontend URL for magic links
PORT=7000                             # Backend server port
```

### Future Considerations

1. Enhanced Admin Features

   - Add data export functionality
   - Implement user impersonation
   - Add team management capabilities
   - Include usage analytics

2. Onboarding Improvements
   - Add team template selection
   - Implement guided tutorials
   - Add progress persistence
   - Include team customization options
