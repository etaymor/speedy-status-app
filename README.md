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
npm run dev
```

## Development

- Backend API will be available at: http://localhost:8000
- Frontend will be available at: http://localhost:5173
- API documentation will be available at: http://localhost:8000/docs

## Testing

- Backend tests: `cd backend && pytest`
- Frontend tests: `cd frontend && npm test`
