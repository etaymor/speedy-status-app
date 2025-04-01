# Speedy Status

A modern team status update management system built with FastAPI and React.

## Project Structure

```
.
├── backend/             # FastAPI backend
│   ├── app/            # Application code
│   ├── tests/          # Backend tests
│   └── requirements.txt # Python dependencies
├── frontend/           # React frontend
│   ├── src/           # Source code
│   └── package.json   # Node.js dependencies
└── README.md
```

## Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+
- Redis

## Backend Setup

1. Create and activate a virtual environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy .env.example to .env and configure your environment variables:

```bash
cp .env.example .env
```

4. Start the development server:

```bash
# First, ensure no existing uvicorn processes are running
pkill -f uvicorn || true  # On Windows: taskkill /F /IM uvicorn.exe /T

# Start the server from the backend directory
cd backend  # Make sure you're in the backend directory
uvicorn app.main:app --reload
```

## Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the development server:

```bash
# First, ensure no existing vite processes are running
pkill -f vite || true  # On Windows: taskkill /F /IM node.exe /T

# Start the server from the frontend directory
cd frontend  # Make sure you're in the frontend directory
npm run dev
```

## Development

- Backend API will be available at: http://localhost:8000
- Frontend will be available at: http://localhost:5173
- API documentation will be available at: http://localhost:8000/docs

## Testing

- Backend tests: `cd backend && pytest`
- Frontend tests: `cd frontend && npm test`
