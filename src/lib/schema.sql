-- ============================================================
-- Sonata: Supabase Schema
-- Paste this into Supabase SQL Editor
-- ============================================================

-- User Progress
create table if not exists user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  current_lesson int default 1,
  streak_days int default 0,
  last_practice_date date,
  total_drills_completed int default 0,
  interval_accuracy jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_progress enable row level security;

create policy "Users can view own progress"
  on user_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on user_progress for update
  using (auth.uid() = user_id);

-- Drill Sessions
create table if not exists drill_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  created_at timestamptz default now(),
  score int,
  total int,
  results jsonb,
  duration_seconds int
);

alter table drill_sessions enable row level security;

create policy "Users can view own drill sessions"
  on drill_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own drill sessions"
  on drill_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own drill sessions"
  on drill_sessions for update
  using (auth.uid() = user_id);

-- Lesson Progress
create table if not exists lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  lesson_id int not null,
  completed boolean default false,
  best_accuracy float default 0,
  completed_at timestamptz
);

alter table lesson_progress enable row level security;

create policy "Users can view own lesson progress"
  on lesson_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own lesson progress"
  on lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own lesson progress"
  on lesson_progress for update
  using (auth.uid() = user_id);

-- Unique constraint for user+lesson combo
create unique index if not exists lesson_progress_user_lesson
  on lesson_progress (user_id, lesson_id);

-- Subscriptions
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  platform text not null default 'web',
  status text not null default 'trial',
  license_key text,
  freemius_user_id text,
  email text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscription"
  on subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscription"
  on subscriptions for update
  using (auth.uid() = user_id);

-- Index for webhook lookups by license key or freemius user ID
create index if not exists subscriptions_license_key on subscriptions (license_key);
create index if not exists subscriptions_freemius_user_id on subscriptions (freemius_user_id);

-- Service role policy for webhook updates (bypasses RLS)
-- The webhook API route uses the service role key to update subscriptions
-- by license_key/freemius_user_id regardless of auth.uid()
