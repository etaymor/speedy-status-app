-- Seed data for testing dashboard functionality

-- Users
INSERT INTO users (id, email, role, name, created_at, last_active_at)
VALUES 
  ('user-1-manager', 'manager@example.com', 'MANAGER', 'Team Manager', NOW() - INTERVAL '30 days', NOW()),
  ('user-2-member', 'member1@example.com', 'MEMBER', 'Team Member 1', NOW() - INTERVAL '25 days', NOW()),
  ('user-3-member', 'member2@example.com', 'MEMBER', 'Team Member 2', NOW() - INTERVAL '20 days', NOW()),
  ('user-4-member', 'member3@example.com', 'MEMBER', 'Team Member 3', NOW() - INTERVAL '15 days', NOW());

-- Team
INSERT INTO teams (id, name, manager_id, prompt_day, prompt_time, timezone, created_at, is_deleted)
VALUES 
  ('team-1', 'Engineering Team', 'user-1-manager', 1, '10:00', 'America/Los_Angeles', NOW() - INTERVAL '30 days', false);

-- Team Memberships
INSERT INTO team_memberships (id, team_id, user_id, status)
VALUES 
  ('tm-1', 'team-1', 'user-1-manager', 'ACTIVE'),
  ('tm-2', 'team-1', 'user-2-member', 'ACTIVE'),
  ('tm-3', 'team-1', 'user-3-member', 'ACTIVE'),
  ('tm-4', 'team-1', 'user-4-member', 'ACTIVE');

-- Subscription
INSERT INTO subscriptions (id, team_id, stripe_customer_id, stripe_subscription_id, plan_tier, status, billing_start_date, trial_used)
VALUES 
  ('sub-1', 'team-1', 'cus_test123', 'sub_test123', 'PRO', 'ACTIVE', NOW() - INTERVAL '30 days', false);

-- Submissions for last 4 weeks
-- Week 4 (Current)
INSERT INTO submissions (id, user_id, team_id, content, submitted_at, week_start_date, is_late)
VALUES 
  ('sub-w4-1', 'user-2-member', 'team-1', 'Completed API integration and fixed 3 critical bugs', NOW() - INTERVAL '1 day', date_trunc('week', NOW()), false),
  ('sub-w4-2', 'user-3-member', 'team-1', 'Working on frontend optimizations and new feature development', NOW() - INTERVAL '2 days', date_trunc('week', NOW()), false),
  ('sub-w4-3', 'user-4-member', 'team-1', 'Implemented user authentication improvements', NOW() - INTERVAL '1 day', date_trunc('week', NOW()), false);

-- Week 3
INSERT INTO submissions (id, user_id, team_id, content, submitted_at, week_start_date, is_late)
VALUES 
  ('sub-w3-1', 'user-2-member', 'team-1', 'Started API integration work', NOW() - INTERVAL '8 days', date_trunc('week', NOW() - INTERVAL '1 week'), false),
  ('sub-w3-2', 'user-3-member', 'team-1', 'Completed user dashboard redesign', NOW() - INTERVAL '9 days', date_trunc('week', NOW() - INTERVAL '1 week'), false),
  ('sub-w3-3', 'user-4-member', 'team-1', 'Investigating performance issues', NOW() - INTERVAL '8 days', date_trunc('week', NOW() - INTERVAL '1 week'), false);

-- Week 2
INSERT INTO submissions (id, user_id, team_id, content, submitted_at, week_start_date, is_late)
VALUES 
  ('sub-w2-1', 'user-2-member', 'team-1', 'Code review and documentation updates', NOW() - INTERVAL '15 days', date_trunc('week', NOW() - INTERVAL '2 week'), false),
  ('sub-w2-2', 'user-3-member', 'team-1', 'Started user dashboard redesign', NOW() - INTERVAL '16 days', date_trunc('week', NOW() - INTERVAL '2 week'), false),
  ('sub-w2-3', 'user-4-member', 'team-1', 'Fixed critical security vulnerability', NOW() - INTERVAL '15 days', date_trunc('week', NOW() - INTERVAL '2 week'), true);

-- Week 1
INSERT INTO submissions (id, user_id, team_id, content, submitted_at, week_start_date, is_late)
VALUES 
  ('sub-w1-1', 'user-2-member', 'team-1', 'Initial project setup and planning', NOW() - INTERVAL '22 days', date_trunc('week', NOW() - INTERVAL '3 week'), false),
  ('sub-w1-2', 'user-3-member', 'team-1', 'Research and architecture planning', NOW() - INTERVAL '23 days', date_trunc('week', NOW() - INTERVAL '3 week'), false),
  ('sub-w1-3', 'user-4-member', 'team-1', 'Development environment setup', NOW() - INTERVAL '22 days', date_trunc('week', NOW() - INTERVAL '3 week'), false);

-- Weekly Summaries
INSERT INTO weekly_summaries (id, team_id, week_start_date, summary_text, generated_at, updated_at, trigger_type)
VALUES 
  ('ws-w3', 'team-1', date_trunc('week', NOW() - INTERVAL '1 week'), 'Team made significant progress on API integration and user dashboard redesign. Performance issues were identified and are being investigated. All team members contributed to their assigned tasks.', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', 'ALL_SUBMITTED'),
  ('ws-w2', 'team-1', date_trunc('week', NOW() - INTERVAL '2 week'), 'Documentation was improved and code reviews completed. A critical security vulnerability was addressed, though slightly delayed. The user dashboard redesign project was initiated.', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', 'TIMEOUT'),
  ('ws-w1', 'team-1', date_trunc('week', NOW() - INTERVAL '3 week'), 'Project successfully initiated with environment setup completed. Team aligned on architecture and planning. Strong foundation laid for upcoming development work.', NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days', 'ALL_SUBMITTED'); 