from jose import jwt
import time
import os
import uuid
from dotenv import load_dotenv

# Generate some test UUIDs for user and team
test_user_id = str(uuid.uuid4())
test_team_id = str(uuid.uuid4())

# Use the same secret key as your application

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")  # Load from environment variables

# Create a test token with all necessary data
token = jwt.encode(
    {
        'sub': test_user_id,
        'team_id': test_team_id,
        'type': 'magic-link',
        'exp': int(time.time()) + 3600  # 1 hour from now
    },
    SECRET_KEY,
    algorithm='HS256'
)

# Only include the token in the URL
print(f'http://localhost:5173/submit?token={token}') 