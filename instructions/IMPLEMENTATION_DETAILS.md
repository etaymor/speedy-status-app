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

handled in .env

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

#### Magic Link Flow

1. **Creation**:

   - If user doesn't exist, creates new user with MEMBER role
   - Default name is derived from email (part before @)
   - Verifies active team membership
   - Generates JWT token with user and team info
   - Returns magic link URL with token

2. **Verification**:

   - Validates token signature and expiration
   - Checks token type is "magic-link"
   - Verifies user exists and has active team membership
   - Issues short-lived access token (30 minutes)
   - Returns access token for API authentication

3. **Error Handling**:
   - Invalid token format: "Not enough segments"
   - Expired token: "Magic link has expired"
   - Invalid membership: "User or team membership not valid"
   - Invalid token type: "Invalid token type"

### Testing Magic Links

#### Test Script Usage

The `generate_test_link.py` script provides a reliable way to test magic links:

```python
# Required packages
pip install python-dotenv prisma python-jose

# Script features
- Uses environment SECRET_KEY for token signing
- Creates/finds test user (test@example.com)
- Creates/finds test team
- Ensures active team membership
- Generates valid magic link token
```

#### Test Data Creation

```python
# Test user creation
test_user = await prisma.user.create(data={
    "email": "test@example.com",
    "name": "Test User",
    "role": "MEMBER"
})

# Test team creation
test_team = await prisma.team.create(data={
    "name": "Test Team",
    "managerId": test_user.id,
    "promptDay": 1,
    "promptTime": "09:00",
    "timezone": "UTC"
})

# Team membership creation
await prisma.teammembership.create(data={
    "userId": test_user.id,
    "teamId": test_team.id,
    "status": "ACTIVE"
})
```

#### Token Generation

```python
# Generate magic link token
token = jwt.encode(
    {
        'sub': test_user.id,
        'team_id': test_team.id,
        'type': 'magic-link',
        'exp': int(time.time()) + 3600  # 1 hour expiry
    },
    SECRET_KEY,
    algorithm='HS256'
)
```

#### Testing Considerations

1. **Database State**:

   - Ensure test user exists
   - Verify team membership is ACTIVE
   - Check team configuration is valid

2. **Token Validation**:

   - Verify token format is correct
   - Check expiration time is appropriate
   - Validate token payload structure

3. **Error Scenarios**:

   - Test with expired tokens
   - Test with inactive memberships
   - Test with invalid token formats
   - Test with non-existent users/teams

4. **Integration Testing**:
   - Verify frontend token handling
   - Check submission flow works
   - Validate error message display

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

Required environment variables are in the .env file

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

## AI Summary Generation System

### Overview

The AI summary generation system uses OpenAI's GPT model to generate concise team status summaries. The system includes:

- Automatic summary generation based on team submissions
- Configurable trigger conditions
- Regeneration support for late updates
- Error handling with retries

### AI Service

```python
class AIService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.max_retries = settings.openai_max_retries
        self.retry_delay = settings.openai_retry_delay

    async def generate_team_summary(self, submissions: List[Submission]) -> str:
        """Generate a team summary with retry logic."""
        system_prompt = """
        You are a professional team manager summarizing weekly updates.
        Write a business-casual summary at a high school reading level.
        Include an overview and bulleted highlights of key achievements.
        Keep the tone positive and forward-looking.
        """

        user_prompt = f"""
        Here are the team's weekly updates:
        {self._format_submissions(submissions)}
        Please provide a summary of the team's progress and upcoming work.
        """

        # Implements exponential backoff retry logic
```

### Summary Service

The summary service handles the business logic for when and how to generate summaries:

```python
class SummaryService:
    def should_generate_summary(self, submissions: List[Submission]) -> bool:
        """Check if summary should be generated based on submissions."""
        # Triggers:
        # 1. All team members have submitted
        # 2. 24 hours have passed since first submission

    async def generate_summary(self, submissions: List[Submission], trigger_type: TriggerType) -> WeeklySummary:
        """Generate and store a new summary or update existing one."""
        # Handles summary generation and storage
        # Includes error handling and validation
```

### Trigger Types

```python
class TriggerType(str, Enum):
    """Enum for summary trigger types."""
    ALL_SUBMITTED = "ALL_SUBMITTED"
    TIMEOUT = "TIMEOUT"
    MANUAL = "MANUAL"
```

### Database Model

```prisma
model WeeklySummary {
    id             String          @id @default(uuid())
    teamId         String         @map("team_id")
    weekStartDate  DateTime       @map("week_start_date")
    summaryText    String         @db.Text @map("summary_text")
    generatedAt    DateTime       @default(now()) @map("generated_at")
    updatedAt      DateTime       @updatedAt @map("updated_at")
    triggerType    TriggerType    @map("trigger_type")
    team           Team           @relation(fields: [teamId], references: [id])

    @@unique([teamId, weekStartDate])
    @@map("weekly_summaries")
}
```

### API Endpoints

```python
# Summary generation endpoints
POST /api/v1/summaries/generate/{team_id}  # Force generate summary
GET /api/v1/summaries/{team_id}            # Get latest summary
GET /api/v1/summaries/{team_id}/history    # Get summary history
```

### Error Handling

The system handles various error scenarios:

1. OpenAI API errors:

   - Rate limiting with exponential backoff
   - Maximum retry attempts
   - Fallback error responses

2. Data validation:
   - Missing or invalid submissions
   - Duplicate summaries
   - Invalid team or date ranges

### Testing Strategy

Comprehensive test suite covering:

```python
@pytest.mark.asyncio
async def test_generate_team_summary_success()
async def test_generate_team_summary_retry_on_rate_limit()
async def test_generate_team_summary_max_retries_exceeded()
async def test_should_generate_summary_all_submitted()
async def test_should_generate_summary_timeout()
async def test_should_not_generate_summary_incomplete()
async def test_generate_summary_new()
async def test_generate_summary_update_existing()
async def test_check_and_generate_if_needed()
```

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4o"  # Model to use
OPENAI_MAX_RETRIES=3   # Maximum retry attempts
OPENAI_RETRY_DELAY=1   # Base delay in seconds
```

### Best Practices

1. AI Integration:

   - Secure API key handling
   - Proper prompt engineering
   - Retry logic for reliability
   - Error handling and logging

2. Summary Management:

   - Efficient storage and retrieval
   - Version tracking
   - Clear trigger conditions
   - Proper data cleanup

3. Testing:
   - Mock AI responses
   - Test various trigger scenarios
   - Validate retry logic
   - Check error handling

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
