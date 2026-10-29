-- PrepSaathi Database Schema
-- Tables ordered to resolve FK dependencies
-- Spec reference: §3

-- 1. SQUADS (no FK dependencies)
create table if not exists squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  exam text not null,
  member_count int default 0,
  created_at timestamptz default now()
);

-- 2. TOPICS (no FK dependencies, seed ~60 rows)
create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  exam text not null,
  subject text not null,
  topic_name text not null,
  difficulty text default 'intermediate'
);

-- 3. PROFILES (references auth.users, squads)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  exam text not null,
  attempt_number int default 1,
  city_tier text,
  daily_target_hrs numeric default 6,
  streak_count int default 0,
  total_points int default 0,
  squad_id uuid references squads(id),
  language_pref text default 'en',
  created_at timestamptz default now()
);

-- 4. MASTERY (references profiles, topics)
create table if not exists mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  topic_id uuid references topics(id),
  score int default 0,
  status text default 'weak',
  attempts int default 0,
  last_tested_at timestamptz,
  updated_at timestamptz default now(),
  unique(user_id, topic_id)
);

-- 5. DAILY_PLANS (references profiles)
create table if not exists daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  plan_date date not null,
  tasks jsonb not null,
  generated_by_ai boolean default true,
  completed_count int default 0,
  created_at timestamptz default now(),
  unique(user_id, plan_date)
);

-- 6. STUDY_LOGS (references profiles)
create table if not exists study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  log_date date not null,
  planned_hrs numeric not null,
  actual_hrs numeric not null,
  topics_covered jsonb,
  created_at timestamptz default now(),
  unique(user_id, log_date)
);

-- 7. PROOFS (references profiles)
create table if not exists proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  proof_date date not null,
  proof_type text not null,
  content_url text,
  content_text text,
  ai_verdict text,
  created_at timestamptz default now()
);

-- 8. DOCUMENTS (references profiles)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  extracted_text text,
  ai_summary text,
  detected_topics jsonb,
  weak_topic_overlap jsonb,
  suggested_tasks jsonb,
  processed boolean default false,
  created_at timestamptz default now()
);

-- 9. QUIZZES (references profiles, topics, documents)
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  topic_id uuid references topics(id),
  source_document_id uuid references documents(id),
  questions jsonb not null,
  user_answers jsonb,
  score int,
  ai_feedback text,
  created_at timestamptz default now()
);
