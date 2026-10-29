-- Enable RLS on all 9 tables
-- Spec reference: §3 Row Level Security

alter table profiles enable row level security;
alter table squads enable row level security;
alter table topics enable row level security;
alter table mastery enable row level security;
alter table daily_plans enable row level security;
alter table study_logs enable row level security;
alter table proofs enable row level security;
alter table quizzes enable row level security;
alter table documents enable row level security;

-- PROFILES: own data + squad visibility
create policy "profiles_own_data" on profiles
  for all using (
    auth.uid() = id
    or squad_id = (select squad_id from profiles where id = auth.uid())
  );

-- SQUADS: members can read their own squad
create policy "squads_member_read" on squads
  for select using (
    id in (select squad_id from profiles where id = auth.uid())
  );

-- TOPICS: public read (seed data, not user-generated)
create policy "topics_public_read" on topics
  for select using (true);

-- MASTERY: own rows only
create policy "mastery_own_rows" on mastery
  for all using (auth.uid() = user_id);

-- DAILY_PLANS: own rows only
create policy "daily_plans_own_rows" on daily_plans
  for all using (auth.uid() = user_id);

-- STUDY_LOGS: own rows only
create policy "study_logs_own_rows" on study_logs
  for all using (auth.uid() = user_id);

-- PROOFS: own rows only
create policy "proofs_own_rows" on proofs
  for all using (auth.uid() = user_id);

-- QUIZZES: own rows only
create policy "quizzes_own_rows" on quizzes
  for all using (auth.uid() = user_id);

-- DOCUMENTS: own rows only
create policy "documents_own_rows" on documents
  for all using (auth.uid() = user_id);
