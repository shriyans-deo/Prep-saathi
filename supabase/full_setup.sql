-- =========================================================
-- PrepSaathi Complete Database Setup Script
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- Covers: 9 Tables, RLS, Triggers, Topics Seed (~60 topics), Storage Buckets & Policies, Demo Seeder
-- =========================================================

-- Step 1: Create Tables in FK dependency order
create table if not exists squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  exam text not null,
  member_count int default 0,
  created_at timestamptz default now()
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  exam text not null,
  subject text not null,
  topic_name text not null,
  difficulty text default 'intermediate'
);

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

-- Step 2: Row Level Security on all 9 tables
alter table profiles enable row level security;
alter table squads enable row level security;
alter table topics enable row level security;
alter table mastery enable row level security;
alter table daily_plans enable row level security;
alter table study_logs enable row level security;
alter table proofs enable row level security;
alter table quizzes enable row level security;
alter table documents enable row level security;

-- Policies (Drop first if re-running)
drop policy if exists "profiles_own_data" on profiles;
create policy "profiles_own_data" on profiles
  for all using (
    auth.uid() = id
    or squad_id = (select squad_id from profiles where id = auth.uid())
  );

drop policy if exists "squads_member_read" on squads;
create policy "squads_member_read" on squads
  for select using (
    id in (select squad_id from profiles where id = auth.uid())
  );

drop policy if exists "topics_public_read" on topics;
create policy "topics_public_read" on topics
  for select using (true);

drop policy if exists "mastery_own_rows" on mastery;
create policy "mastery_own_rows" on mastery
  for all using (auth.uid() = user_id);

drop policy if exists "daily_plans_own_rows" on daily_plans;
create policy "daily_plans_own_rows" on daily_plans
  for all using (auth.uid() = user_id);

drop policy if exists "study_logs_own_rows" on study_logs;
create policy "study_logs_own_rows" on study_logs
  for all using (auth.uid() = user_id);

drop policy if exists "proofs_own_rows" on proofs;
create policy "proofs_own_rows" on proofs
  for all using (auth.uid() = user_id);

drop policy if exists "quizzes_own_rows" on quizzes;
create policy "quizzes_own_rows" on quizzes
  for all using (auth.uid() = user_id);

drop policy if exists "documents_own_rows" on documents;
create policy "documents_own_rows" on documents
  for all using (auth.uid() = user_id);

-- Step 3: Database Triggers (§4)
create or replace function bump_streak() returns trigger as $$
begin
  update profiles
    set streak_count = streak_count + 1,
        total_points = total_points + 50
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_proof_insert on proofs;
create trigger on_proof_insert
  after insert on proofs
  for each row execute function bump_streak();

create or replace function recompute_mastery_status() returns trigger as $$
begin
  new.status := case
    when new.score < 40 then 'weak'
    when new.score <= 70 then 'learning'
    else 'mastered'
  end;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_mastery_score_change on mastery;
create trigger on_mastery_score_change
  before update of score on mastery
  for each row execute function recompute_mastery_status();

-- Step 4: Seed Topics (~60 topics for SSC CGL & UPSC)
insert into topics (exam, subject, topic_name, difficulty) values
  ('SSC CGL', 'Quantitative Aptitude', 'Number System', 'intermediate'),
  ('SSC CGL', 'Quantitative Aptitude', 'Percentage', 'intermediate'),
  ('SSC CGL', 'Quantitative Aptitude', 'Ratio and Proportion', 'intermediate'),
  ('SSC CGL', 'Quantitative Aptitude', 'Time, Speed and Distance', 'hard'),
  ('SSC CGL', 'Quantitative Aptitude', 'Time and Work', 'intermediate'),
  ('SSC CGL', 'Quantitative Aptitude', 'Profit and Loss', 'easy'),
  ('SSC CGL', 'Quantitative Aptitude', 'Simple and Compound Interest', 'intermediate'),
  ('SSC CGL', 'Quantitative Aptitude', 'Geometry and Mensuration', 'hard'),
  ('SSC CGL', 'Reasoning', 'Syllogism', 'intermediate'),
  ('SSC CGL', 'Reasoning', 'Coding-Decoding', 'easy'),
  ('SSC CGL', 'Reasoning', 'Blood Relations', 'intermediate'),
  ('SSC CGL', 'Reasoning', 'Direction Sense', 'easy'),
  ('SSC CGL', 'Reasoning', 'Analogy', 'easy'),
  ('SSC CGL', 'Reasoning', 'Series', 'intermediate'),
  ('SSC CGL', 'Reasoning', 'Statement and Conclusion', 'hard'),
  ('SSC CGL', 'Reasoning', 'Seating Arrangement', 'hard'),
  ('SSC CGL', 'English', 'Reading Comprehension', 'intermediate'),
  ('SSC CGL', 'English', 'Cloze Test', 'intermediate'),
  ('SSC CGL', 'English', 'Error Spotting', 'easy'),
  ('SSC CGL', 'English', 'Sentence Improvement', 'intermediate'),
  ('SSC CGL', 'English', 'Idioms and Phrases', 'easy'),
  ('SSC CGL', 'English', 'One Word Substitution', 'easy'),
  ('SSC CGL', 'English', 'Synonyms and Antonyms', 'easy'),
  ('SSC CGL', 'English', 'Para Jumbles', 'intermediate'),
  ('SSC CGL', 'General Awareness', 'Indian History', 'intermediate'),
  ('SSC CGL', 'General Awareness', 'Indian Polity', 'intermediate'),
  ('SSC CGL', 'General Awareness', 'Geography', 'intermediate'),
  ('SSC CGL', 'General Awareness', 'Economics', 'hard'),
  ('SSC CGL', 'General Awareness', 'General Science', 'intermediate'),
  ('SSC CGL', 'General Awareness', 'Current Affairs', 'easy'),
  ('SSC CGL', 'General Awareness', 'Static GK', 'easy'),
  ('SSC CGL', 'General Awareness', 'Computer Awareness', 'easy'),
  ('UPSC CSE', 'Polity', 'Indian Constitution', 'hard'),
  ('UPSC CSE', 'Polity', 'Fundamental Rights and Duties', 'intermediate'),
  ('UPSC CSE', 'Polity', 'Parliament and State Legislature', 'hard'),
  ('UPSC CSE', 'Polity', 'Judiciary', 'intermediate'),
  ('UPSC CSE', 'Polity', 'Panchayati Raj', 'intermediate'),
  ('UPSC CSE', 'Polity', 'Constitutional Bodies', 'hard'),
  ('UPSC CSE', 'Polity', 'Governance and Public Policy', 'hard'),
  ('UPSC CSE', 'History', 'Ancient India', 'intermediate'),
  ('UPSC CSE', 'History', 'Medieval India', 'intermediate'),
  ('UPSC CSE', 'History', 'Modern India and Freedom Struggle', 'hard'),
  ('UPSC CSE', 'History', 'Art and Culture', 'intermediate'),
  ('UPSC CSE', 'History', 'World History', 'hard'),
  ('UPSC CSE', 'History', 'Post-Independence India', 'hard'),
  ('UPSC CSE', 'History', 'Social Reform Movements', 'intermediate'),
  ('UPSC CSE', 'Geography', 'Physical Geography', 'intermediate'),
  ('UPSC CSE', 'Geography', 'Indian Geography', 'intermediate'),
  ('UPSC CSE', 'Geography', 'World Geography', 'hard'),
  ('UPSC CSE', 'Geography', 'Climatology', 'intermediate'),
  ('UPSC CSE', 'Geography', 'Oceanography', 'hard'),
  ('UPSC CSE', 'Geography', 'Human Geography', 'intermediate'),
  ('UPSC CSE', 'Geography', 'Environmental Geography', 'intermediate'),
  ('UPSC CSE', 'Economy', 'Indian Economy Basics', 'intermediate'),
  ('UPSC CSE', 'Economy', 'Banking and Finance', 'hard'),
  ('UPSC CSE', 'Economy', 'Fiscal Policy', 'hard'),
  ('UPSC CSE', 'Economy', 'Monetary Policy', 'hard'),
  ('UPSC CSE', 'Economy', 'International Trade', 'intermediate'),
  ('UPSC CSE', 'Economy', 'Agriculture and Industry', 'intermediate'),
  ('UPSC CSE', 'Economy', 'Economic Reforms', 'hard'),
  ('UPSC CSE', 'Environment', 'Ecology and Biodiversity', 'intermediate'),
  ('UPSC CSE', 'Environment', 'Climate Change', 'hard'),
  ('UPSC CSE', 'Environment', 'Environmental Laws and Policies', 'intermediate'),
  ('UPSC CSE', 'Environment', 'Conservation Efforts', 'intermediate')
on conflict do nothing;

-- Step 5: Storage Buckets (Private)
insert into storage.buckets (id, name, public)
values 
  ('proofs', 'proofs', false),
  ('documents', 'documents', false)
on conflict (id) do nothing;

-- Storage Policies
drop policy if exists "proofs_owner_insert" on storage.objects;
create policy "proofs_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'proofs'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );

drop policy if exists "proofs_owner_select" on storage.objects;
create policy "proofs_owner_select" on storage.objects
  for select using (
    bucket_id = 'proofs'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );

drop policy if exists "documents_owner_insert" on storage.objects;
create policy "documents_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );

drop policy if exists "documents_owner_select" on storage.objects;
create policy "documents_owner_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (auth.uid() = owner or auth.uid()::text = (storage.foldername(name))[1])
  );
