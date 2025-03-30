# Speedy Status – Detailed Implementation Checklist ✅

This checklist outlines every phase of building the Speedy Status MVP with:
• FastAPI on the backend
• Prisma ORM + PostgreSQL for data
• Vite on the frontend
• Celery + Redis for background tasks
• FastAPI Oath2 for manager authentication
• Slack, Twilio, Stripe integrations

⸻

## 🏗 Phase 1: Project Setup

    1.	Monorepo or multi-folder structure (pick your preference):
    •	[x] /backend: Contains FastAPI + Celery + Prisma code
    •	[x] /frontend: Contains React app
    •	[x] README.md: Explains the project layout and how to set up each part
    2.	Initialize FastAPI backend:
    •	[x] Create main.py (or app.py) as the entry point
    •	[x] Install packages:
    •	fastapi
    •	uvicorn[standard]
    •	pydantic
    •	python-dotenv (optional, if using .env)
    •	[x] Write minimal FastAPI app with a single route
    3.	Create a /health endpoint:
    •	[x] Define GET /health returning { "status": "ok" }
    •	[x] Test locally via curl or browser
    4.	Environment variables:
    •	[x] Create .env file for DB credentials, secrets, etc.
    •	[x] Optionally use a Pydantic settings loader in config.py
    •	[x] Keep .env out of source control (add to .gitignore)
    5.	Local installation of Postgres & Redis:
    •	[x] Install PostgreSQL on your system (or use a remote instance)
    •	[x] Create a database (e.g., speedy_status_db)
    •	[x] Install and start Redis (listening on localhost:6379)
    6.	React frontend setup (no Next.js):
    •	[x] In /frontend, create a React + TypeScript project (e.g., with Vite or Create React App)
    •	[x] Install and configure Tailwind CSS (if desired)
    •	[x] Confirm you can run npm start (or yarn dev) and see a basic page

⸻

## 📄 Phase 2: Database Models & Migrations (Prisma)

    1.	Install & configure Prisma:
    •	[x] pip install prisma-client-py
    •	[x] Create a prisma/ folder in /backend
    •	[x] Add schema.prisma referencing your Postgres DB via env var (DATABASE_URL)
    2.	Define Prisma models in schema.prisma:
    •	[x] User
    •	[x] Team
    •	[x] TeamMembership
    •	[x] Submission
    •	[x] Subscription
    •	[x] ScheduledPromptJob
    •	[x] WeeklySummary
    3.	Run Prisma migrations:
    •	[x] prisma migrate dev --name init (or prisma db push)
    •	[x] Verify tables in PostgreSQL
    4.	Prisma client usage:
    •	[x] Generate the Python Prisma client
    •	[x] Test queries in a small script or route (e.g. create a User record)
    5.	Optional seed script:
    •	[x] Create a script to insert sample data: manager user, test team, etc.

⸻

## 🔐 Phase 3: Authentication & Authorization

    1.	Integrate FastAPI OAuth2:
    •	[x] Install fastapi-users or python-jose for JWT handling
    •	[x] Create routes for:
    •	/auth/login (with username/password)
    •	/auth/token (OAuth2 token endpoint)
    •	/auth/logout
    •	[x] Configure OAuth2 with Password flow and Bearer token authentication
    2.	Protect manager routes:
    •	[x] Create OAuth2 scopes for manager role
    •	[x] Use FastAPI dependencies with security_scopes to protect routes
    •	[x] Add OAuth2 bearer token validation middleware
    3.	Magic link for team members:
    •	[x] Use JWT tokens with short expiry for magic links
    •	[x] Create GET/POST routes at /api/v1/magic-links/{token}
    •	[x] Set token expiry to 72 hours with no refresh token

⸻

## 📅 Phase 4: Team Setup & Configuration

    1.	Team creation flow:
    •	[ ] POST /team for manager to create a new team
    •	[ ] POST /team/members to add members by email
    •	[ ] PUT /team/schedule to set day/time/timezone
    2.	Prompt schedule:
    •	[ ] Store promptDay, promptTime, timezone in the Team record
    •	[ ] Convert local times to UTC behind the scenes
    3.	Frontend integration:
    •	[ ] Provide a basic UI in React for manager to create/edit a team
    •	[ ] Show success or errors from the backend

⸻

## 🕒 Phase 5: Prompt Scheduling (Celery + Redis)

    1.	Install & configure Celery:
    •	[ ] pip install celery
    •	[ ] Create a celery_app.py or similar with config pointing to Redis at localhost:6379
    •	[ ] Add tasks module for background jobs
    2.	ScheduledPromptJob logic**:
    •	[ ] For each team, read promptDay, promptTime, schedule a job
    •	[ ] Option: Celery Beat or a custom cron to enqueue tasks
    •	[ ] Track job status (pending, sent, failed)
    3.	Prompt-sending tasks:
    •	[ ] send_prompt(team_id) Celery task stubs out:
    •	[ ] Email or Slack DM or Twilio call
    •	[ ] Store job results in ScheduledPromptJob

⸻

## ✍️ Phase 6: Submission System

    1.	Submission API:
    •	[ ] POST /api/v1/submissions
    •	Validates token (if magic link) or Slack/Twilio signature
    •	Saves submission with userId, teamId, content
    •	Marks is_late if after schedule deadline
    2.	Frontend submission form (for email link):
    •	[ ] Minimal page that appears when user clicks magic link
    •	[ ] Textarea for status update
    •	[ ] Submit to /api/v1/submissions with the token
    3.	Allow edits:
    •	[ ] Decide if users can resubmit until manager's summary is generated
    •	[ ] Store or overwrite existing submissions

⸻

## 🤖 Phase 7: AI Summary Generation

    1.	AI integration:
    •	[ ] Use GPT-like model or "GPT-4o-mini" (stub or real)
    •	[ ] Prompt template for summarizing weekly updates
    •	[ ] Save result in WeeklySummary with generatedAt
    2.	Trigger conditions:
    •	[ ] Generate summary automatically once all members submit
    •	OR [ ] Generate summary after a 24-hour grace period from the scheduled time
    •	[ ] Manual trigger: /api/v1/summaries/generate for manager to force summary
    3.	Regeneration on late updates:
    •	[ ] If late submission arrives, re-run summary logic
    •	[ ] Overwrite previous text or store versioning

⸻

## 📧 Phase 8: Multi-Channel Notifications

    1.	Email prompt system:
    •	[ ] Setup an email service (SendGrid, SMTP, etc.)
    •	[ ] Weekly "It's time to submit" email with a magic link
    •	[ ] Manager summary email after generation
    2.	Slack integration:
    •	[ ] Create Slack app, configure OAuth
    •	[ ] Send DM with a link or accept direct text as submission
    •	[ ] (Optional) Post summary in a Slack channel for the manager
    3.	Twilio phone prompts (optional):
    •	[ ] Configure Twilio phone number
    •	[ ] Call flow: user hears instructions → records or keys in update
    •	[ ] Transcribe and store as submission
    4.	Reminders:
    •	[ ] If user hasn't submitted by X time, send a reminder DM/email/call

⸻

## 🏷 Phase 9: Manager Dashboard

    1.	Dashboard APIs:
    •	[ ] GET /api/v1/teams/{teamId}/dashboard
    •	Returns team info, submissions, summary
    •	[ ] PUT /api/v1/teams/{teamId}/dashboard (if editing schedule or members)
    2.	React dashboard:
    •	[ ] Route: /dashboard
    •	[ ]] List all teams the manager has
    •	[ ] Display each team's weekly status, who submitted, who hasn't
    •	[ ] View or regenerate summary
    3.	Resend prompt & reminders:
    •	[ ] Button to resend prompt to non-responders
    •	[ ] Confirm or success message after

⸻

## 💳 Final Phase: Payments & Production Launch

    1.	Stripe integration:
    •	[ ] POST /api/v1/billing/subscribe takes a Stripe payment method
    •	[ ] Subscription table stores plan tier (free, paid) and status
    •	[ ] Webhook to handle subscription updates/cancellations
    2.	Enforce free vs. paid tier:
    •	[ ] Free tier: 1 active team or limited features (your choice)
    •	[ ] If usage exceeds free plan, require upgrade
    3.	Soft deletes & data retention:
    •	[ ] If a team is deleted, mark is_deleted = true or similar
    •	[ ] Keep data for historical analytics unless manager requests purge
    4.	Monitoring & error handling:
    •	[ ] Add Sentry or similar for error tracking
    •	[ ] Implement logging for Celery tasks and critical API calls
    5.	Production deployment (no Docker):
    •	[ ] Install Python, Postgres, Redis on your server or use managed services
    •	[ ] Copy code, set up environment variables for secrets (Stripe, Slack, Twilio)
    •	[ ] Start FastAPI with a production server (e.g., gunicorn or uvicorn in production mode)
    •	[ ] Start Celery worker (celery -A celery_app worker --loglevel=info)
    •	[ ] Serve React build via a static file server or Node-based hosting
    6.	QA & smoke tests:
    •	[ ] Test end-to-end: manager login → create team → add member → schedule prompt → member submits → manager sees summary
    •	[ ]] Verify Slack/Twilio/Stripe integrations in a test environment

⸻

✅ Use This List as Your Development Roadmap

Following these step-by-step tasks will guide you through setting up Speedy Status with:
• FastAPI + Celery + Redis + Prisma (PostgreSQL) on the backend
• React (no Next.js) for the frontend
• Fast APIs Oath for manager authentication
• Slack, Twilio, Stripe for communication and billing
