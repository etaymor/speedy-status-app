# Speedy Status – Developer Specification (spec.md)

## Overview

Speedy Status is a simple, scalable SaaS tool to help managers collect weekly status updates from their teams across email, Slack, and phone. It is designed for ease-of-use, automation, and AI-assisted summaries to align teams with minimal friction.

---

## 🎯 Key Goals

- Weekly asynchronous updates from team members
- Multi-channel submission (email, Slack, phone call)
- AI-generated summary for managers
- Simple dashboard with submission status and history
- Clean, fast UX with responsive design

---

## 👥 User Roles

### Manager

- Creates account and teams
- Sets weekly schedule (day/time)
- Adds team members (by email)
- Receives AI summary via email/Slack
- Views dashboard with responses, history, and status

### Team Member

- Receives weekly prompt
- Responds via email, Slack DM, phone call, or web form
- Can edit submission before summary generation
- No login or dashboard required

---

## 🔐 Auth & Access

- Authentication: [Fast API OAuth](https://fastapi.tiangolo.com/tutorial/security/first-steps/#fastapis-oauth2passwordbearer)
- Team members access via magic link (no login)
- Managers authenticate via BetterAuth (email or Google login)
- All data transmission must be HTTPS-secured

---

## 🛠 Tech Stack

- **Backend**: FastAPI
- **Frontend**: React Typescript, Tailwind
- **Job Queue**: Celery + Redis
- **Database**: PostgreSQL with Prisma ORM
- **AI Provider**: OpenAI GPT-4o-mini
- **Email**: Mailjet
- **Slack Integration**: Slack API + OAuth
- **Phone Call Integration**: Twilio (voice, transcription)
- **Payments**: Stripe (tiered billing by team size)
- **Analytics**: Google Analytics, PostHog
- **Error Monitoring**: Sentry

---

## 📦 Core Data Models

### User

- `id`
- `email`
- `role` (manager, member)
- `name`
- `auth_provider_id`
- `created_at`
- `last_active_at`

### Team

- `id`
- `name`
- `manager_id`
- `prompt_day` (Mon–Sun)
- `prompt_time` (in local timezone)
- `timezone` (e.g., "America/New_York")
- `created_at`
- `is_deleted`

### TeamMembership

- `id`
- `team_id`
- `user_id`
- `status` (active, removed)

### Submission

- `id`
- `user_id`
- `team_id`
- `content` (Markdown)
- `submitted_at`
- `week_start_date`
- `is_late`

### Subscription

- `id`
- `team_id`
- `stripe_customer_id`
- `stripe_subscription_id`
- `plan_tier`
- `status` (trialing, active, canceled)
- `billing_start_date`
- `billing_end_date`
- `trial_used`
- `trial_prompt_sent_at`

### ScheduledPromptJob

- `id`
- `team_id`
- `scheduled_for` (UTC datetime)
- `status` (pending, sent, failed, canceled)
- `channel` (email, slack, phone, all)
- `created_at`

### WeeklySummary

- `id`
- `team_id`
- `week_start_date`
- `summary_text`
- `generated_at`
- `updated_at`
- `trigger_type` (all_submitted, timeout, manual)

---

## 📆 Scheduling Logic

- Prompts scheduled based on `prompt_day` + `prompt_time` in manager's timezone
- Converted to UTC for background job system
- Celery periodically polls for `ScheduledPromptJob` with status `pending`
- Once sent, it creates next week's job

---

## 📨 Prompt Flow

- Templated message (centralized, not editable per team)
- Sent via:
  - Email
  - Slack DM (if connected)
  - Phone call (if number on file)
- Slack and phone settings configured post-onboarding
- Reminder sent if no submission within 24 hours

---

## 📝 Response Handling

- Response page (magic link):
  - Shows team name
  - Optional name input
  - Markdown-supported textbox
  - Submit + thank-you message
- Only latest submission is stored per week
- Response can be edited until AI summary is generated

---

## 🧠 AI Summary

- Triggered when:
  - All members submit
  - OR 24h after prompt time
- GPT-4o-mini summary format:
  - 1-paragraph intro
  - Bulleted list by theme or individual
  - Business casual tone, high school reading level
- Late submissions re-trigger summary generation
- Summary is emailed and available on dashboard

---

## 📊 Manager Dashboard

- View AI summary + raw responses
- Submission status (✔ / ❌)
- Per-user history view
- Resend prompt for non-responders
- Team settings (edit time/day, members)
- Pagination for older weeks
- Soft delete teams

---

## 💳 Billing & Subscription

- Stripe integration (auto-adjust pricing by active members)
- One free prompt per team
- Billing kicks in after trial used
- Soft delete deactivates team and cancels subscription
- Subscription status check before sending prompts

---

## 🧪 Testing Plan

### Unit Tests

- Prompt scheduling logic
- Submission creation and late flag
- AI summary trigger and output
- Member addition/removal

### Integration Tests

- Email delivery and parsing
- Slack prompt + reply handling
- Phone call transcription handling (Twilio)
- Stripe webhook and billing sync

### Manual Testing

- Full onboarding flow (manager)
- Full prompt → response → summary loop
- Multi-timezone team setup
- Editing submissions before and after summary

---

## 🛡️ Error Handling

- Retry failed prompt deliveries (Celery retry + exponential backoff)
- Log API errors from email/Slack/Twilio
- Fallback to email if Slack or phone fails
- Store failed job metadata for review
- Sentry alerts on backend failures

---

## 🧰 Dev Setup

- `.env` for all service credentials
- Docker config for local DB/Redis/Celery
- Predefined test data scripts (sample team, users)
- Readme with setup instructions (to be provided separately)

---

## ⏭️ Post-MVP Features

- Shared team visibility
- Summary regeneration button
- Submission trend analytics
- CSV/PDF export
- Admin/super-admin panel
- Prompt previews
- Feedback prompts
- In-app support links
