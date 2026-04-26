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

-- Practice Days — one row per user per local calendar day they practised.
-- Used to compute streaks across all activities (lessons, drills, sight read,
-- rhythm, etc.) rather than deriving from drill_sessions only.
create table if not exists practice_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  practice_date date not null,
  created_at timestamptz default now()
);

create unique index if not exists practice_days_user_date
  on practice_days (user_id, practice_date);

alter table practice_days enable row level security;

create policy "Users can view own practice days"
  on practice_days for select
  using (auth.uid() = user_id);

create policy "Users can insert own practice days"
  on practice_days for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- Cached Lessons
-- ============================================================
-- Server-side cache for LLM-generated lesson YAMLs. Keyed on
-- (concept_id, mastered_hash) so lessons adapt to what the student has
-- already learned — a student approaching "skips" with only Middle C
-- mastered gets a different generation than one approaching it with
-- the whole staircase already known.
--
-- mastered_hash is a sha256 of the sorted, comma-joined mastered concept
-- ids — see src/lib/v2/lessonCache.ts for the canonical implementation.
-- In practice most students share the canonical prereq set so cache hits
-- are still high; edge cases regenerate at ~$0.005 each.
--
-- Service-role only — no public read or write. /tmp on Vercel was wiping
-- this on every deploy and forcing regeneration; this table makes the
-- cache durable.
drop table if exists cached_lessons cascade;
create table cached_lessons (
  concept_id text not null,
  mastered_hash text not null,
  yaml text not null,
  model_id text,
  tokens_total int,
  duration_ms int,
  warnings jsonb default '[]'::jsonb,
  -- For debugging / analytics: which prereqs did the student have when
  -- this row was generated? Stored alongside the hash so we can inspect.
  mastered_concepts jsonb default '[]'::jsonb,
  path_position int,
  path_length int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (concept_id, mastered_hash)
);

create index if not exists cached_lessons_concept_id
  on cached_lessons (concept_id);

alter table cached_lessons enable row level security;
-- No policies: anon + authed users have zero access. Service role
-- bypasses RLS so the API route writes/reads freely.

-- Licenses (Gumroad license key activation)
create table if not exists licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  license_key text not null,
  product_id text,
  email text,
  activated_at timestamptz default now()
);

alter table licenses enable row level security;

create policy "Users can view own license"
  on licenses for select
  using (auth.uid() = user_id);

create policy "Users can insert own license"
  on licenses for insert
  with check (auth.uid() = user_id);
