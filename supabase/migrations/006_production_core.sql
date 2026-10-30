-- Production hardening.
-- Fixes the recursive profiles policy that blocked every real user, locks down
-- columns users must not edit, and moves multi-step writes into atomic RPCs.
-- "Today" is always Asia/Kolkata so squad members share one calendar day.

create or replace function public.ist_today()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Kolkata')::date
$$;

-- ---------------------------------------------------------------------------
-- Schema changes
-- ---------------------------------------------------------------------------

alter table profiles alter column exam drop not null;
update profiles set exam = null where exam = '';
alter table profiles add column if not exists last_proof_date date;
alter table profiles add column if not exists squad_joined_at timestamptz;
alter table profiles add column if not exists is_demo boolean not null default false;

alter table squads add column if not exists is_demo boolean not null default false;

alter table daily_plans add column if not exists source text not null default 'ai';

alter table documents add column if not exists quiz jsonb;
alter table documents add column if not exists difficulty text;
alter table documents add column if not exists process_error text;

alter table quizzes add column if not exists topic_name text;
alter table quizzes add column if not exists feedback jsonb;
alter table quizzes add column if not exists completed_at timestamptz;

alter table proofs add column if not exists duration_seconds int;

alter table quizzes drop constraint if exists quizzes_source_document_id_fkey;
alter table quizzes add constraint quizzes_source_document_id_fkey
  foreign key (source_document_id) references documents(id) on delete set null;

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  session_date date not null,
  topic_name text,
  task_text text,
  minutes int not null check (minutes between 1 and 960),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists plan_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  target_date date not null,
  task jsonb not null,
  source text not null check (source in ('document', 'quiz')),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists retests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  topic_id uuid references topics(id),
  topic_name text not null,
  due_date date not null,
  source_quiz_id uuid references quizzes(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,
  headline text not null,
  pattern text not null,
  win text not null,
  next_week_focus text not null,
  source text not null default 'ai',
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists ai_usage (
  user_id uuid not null references profiles(id) on delete cascade,
  hour_bucket timestamptz not null,
  calls int not null default 0,
  primary key (user_id, hour_bucket)
);

create index if not exists study_logs_user_date_idx on study_logs (user_id, log_date desc);
create index if not exists daily_plans_user_date_idx on daily_plans (user_id, plan_date desc);
create index if not exists proofs_user_date_idx on proofs (user_id, proof_date desc);
create index if not exists quizzes_user_created_idx on quizzes (user_id, created_at desc);
create index if not exists documents_user_created_idx on documents (user_id, created_at desc);
create index if not exists mastery_user_score_idx on mastery (user_id, score);
create index if not exists plan_queue_user_date_idx on plan_queue (user_id, target_date) where consumed_at is null;
create index if not exists retests_user_due_idx on retests (user_id, due_date) where completed_at is null;
create index if not exists profiles_squad_idx on profiles (squad_id);
create unique index if not exists topics_exam_name_key on topics (exam, topic_name);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table study_sessions enable row level security;
alter table plan_queue enable row level security;
alter table retests enable row level security;
alter table weekly_reflections enable row level security;
alter table ai_usage enable row level security;

drop policy if exists "profiles_own_data" on profiles;
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Streaks, points, exam and squad change only through the functions below.
revoke insert, update, delete on profiles from authenticated, anon;
grant select on profiles to authenticated;
grant update (name, attempt_number, city_tier, daily_target_hrs, language_pref) on profiles to authenticated;

drop policy if exists "squads_member_read" on squads;
create policy "squads_member_read" on squads for select using (
  id = (select squad_id from profiles where id = auth.uid())
);
revoke insert, update, delete on squads from authenticated, anon;

drop policy if exists "study_sessions_own_rows" on study_sessions;
create policy "study_sessions_own_rows" on study_sessions for all using (auth.uid() = user_id);
drop policy if exists "plan_queue_own_rows" on plan_queue;
create policy "plan_queue_own_rows" on plan_queue for all using (auth.uid() = user_id);
drop policy if exists "retests_own_rows" on retests;
create policy "retests_own_rows" on retests for all using (auth.uid() = user_id);
drop policy if exists "weekly_reflections_own_rows" on weekly_reflections;
create policy "weekly_reflections_own_rows" on weekly_reflections for all using (auth.uid() = user_id);
-- ai_usage has RLS on and no policies: only security definer functions touch it.

-- ---------------------------------------------------------------------------
-- Storage: owner folder only, with size and type limits
-- ---------------------------------------------------------------------------

update storage.buckets
  set file_size_limit = 15728640, allowed_mime_types = array['application/pdf']
  where id = 'documents';
update storage.buckets
  set file_size_limit = 15728640,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'audio/webm', 'audio/mp4', 'audio/ogg']
  where id = 'proofs';

do $$
declare
  b text;
  op text;
begin
  foreach b in array array['proofs', 'documents'] loop
    foreach op in array array['insert', 'select', 'update', 'delete'] loop
      execute format('drop policy if exists %I on storage.objects', b || '_owner_' || op);
    end loop;
    execute format(
      'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L and auth.uid()::text = (storage.foldername(name))[1])',
      b || '_owner_insert', b);
    execute format(
      'create policy %I on storage.objects for select to authenticated using (bucket_id = %L and auth.uid()::text = (storage.foldername(name))[1])',
      b || '_owner_select', b);
    execute format(
      'create policy %I on storage.objects for update to authenticated using (bucket_id = %L and auth.uid()::text = (storage.foldername(name))[1])',
      b || '_owner_update', b);
    execute format(
      'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and auth.uid()::text = (storage.foldername(name))[1])',
      b || '_owner_delete', b);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Every new auth user gets a profile row; exam stays null until onboarding.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, is_demo)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'Aspirant'),
    coalesce(new.is_anonymous, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into profiles (id, name)
select u.id, coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(u.email, ''), '@', 1), 'Aspirant')
from auth.users u
on conflict (id) do nothing;

-- Mastery status follows score on insert as well as update.
drop trigger if exists on_mastery_score_change on mastery;
create trigger on_mastery_score_change
  before insert or update of score on mastery
  for each row execute function recompute_mastery_status();

-- Proof date is server-decided so it cannot be backdated.
create or replace function public.set_proof_date()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not coalesce((select is_demo from profiles where id = new.user_id), false) then
    new.proof_date := ist_today();
  end if;
  return new;
end;
$$;

drop trigger if exists before_proof_insert on proofs;
create trigger before_proof_insert
  before insert on proofs
  for each row execute function public.set_proof_date();

-- One streak step and one points award per day, however many proofs are filed.
create or replace function public.bump_streak()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_last date;
begin
  if new.proof_date <> ist_today() then
    return new;
  end if;
  select last_proof_date into v_last from profiles where id = new.user_id for update;
  if v_last = new.proof_date then
    return new;
  end if;
  update profiles
    set streak_count = case when v_last = new.proof_date - 1 then streak_count + 1 else 1 end,
        total_points = total_points + 50,
        last_proof_date = new.proof_date
  where id = new.user_id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Onboarding and squads
-- ---------------------------------------------------------------------------

create or replace function public.join_squad_for_exam(p_user uuid, p_exam text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_squad uuid;
  v_current uuid;
  v_current_exam text;
  v_count int;
begin
  select p.squad_id, s.exam into v_current, v_current_exam
  from profiles p left join squads s on s.id = p.squad_id
  where p.id = p_user;

  if v_current is not null and v_current_exam = p_exam then
    return v_current;
  end if;
  if v_current is not null then
    update squads set member_count = greatest(member_count - 1, 0) where id = v_current;
  end if;

  select id into v_squad from squads
  where exam = p_exam and not is_demo and member_count < 6
  order by created_at
  limit 1
  for update skip locked;

  if v_squad is null then
    select count(*) + 1 into v_count from squads where exam = p_exam and not is_demo;
    insert into squads (name, exam, member_count)
    values (p_exam || ' Squad ' || v_count, p_exam, 0)
    returning id into v_squad;
  end if;

  update squads set member_count = member_count + 1 where id = v_squad;
  update profiles set squad_id = v_squad, squad_joined_at = now() where id = p_user;
  return v_squad;
end;
$$;
revoke execute on function public.join_squad_for_exam(uuid, text) from public, anon, authenticated;

create or replace function public.complete_onboarding(
  p_exam text,
  p_attempt int,
  p_city_tier text,
  p_daily_target numeric,
  p_weak_subjects text[]
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from topics where exam = p_exam) then
    raise exception 'unknown_exam';
  end if;
  if p_daily_target < 1 or p_daily_target > 16 then
    raise exception 'invalid_target';
  end if;
  if coalesce(array_length(p_weak_subjects, 1), 0) not between 1 and 3 then
    raise exception 'pick_one_to_three_subjects';
  end if;

  update profiles
    set exam = p_exam,
        attempt_number = greatest(p_attempt, 1),
        city_tier = p_city_tier,
        daily_target_hrs = p_daily_target
  where id = v_uid;

  insert into mastery (user_id, topic_id, score, attempts)
  select v_uid, t.id, case when t.subject = any (p_weak_subjects) then 30 else 60 end, 0
  from topics t
  where t.exam = p_exam
  on conflict (user_id, topic_id) do nothing;

  perform join_squad_for_exam(v_uid, p_exam);
end;
$$;

-- Pseudonymous squad view. Exposes check-in status and totals, never names or proof content.
create or replace function public.get_squad_board()
returns table (
  seat text,
  is_me boolean,
  streak int,
  hours_week numeric,
  checkins_week int,
  checked_in_today boolean,
  last_checkin_at timestamptz,
  is_sample boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_squad uuid;
  v_demo boolean;
  v_today date := ist_today();
begin
  select squad_id, is_demo into v_squad, v_demo from profiles where id = v_uid;
  if v_squad is null then
    return;
  end if;

  if v_demo then
    return query
      select s.seat, s.is_me, s.streak, s.hours_week, s.checkins_week, s.checked_in_today, s.last_checkin_at, s.is_sample
      from (
        select 'A'::text as seat, false as is_me, 18 as streak, 34.5::numeric as hours_week, 7 as checkins_week, true as checked_in_today, now() - interval '2 hours' as last_checkin_at, true as is_sample
        union all select 'B', false, 14, 31.0, 6, true, now() - interval '45 minutes', true
        union all select 'C', false, 9, 26.5, 5, true, now() - interval '4 hours', true
        union all
        select 'D', true,
          case when p.last_proof_date >= v_today - 1 then p.streak_count else 0 end,
          coalesce((select sum(l.actual_hrs) from study_logs l where l.user_id = v_uid and l.log_date > v_today - 7), 0),
          (select count(distinct pr.proof_date)::int from proofs pr where pr.user_id = v_uid and pr.proof_date > v_today - 7),
          p.last_proof_date = v_today,
          (select max(pr.created_at) from proofs pr where pr.user_id = v_uid),
          false
        from profiles p where p.id = v_uid
        union all select 'E', false, 0, 16.0, 3, false, now() - interval '28 hours', true
        union all select 'F', false, 0, 14.2, 2, false, now() - interval '31 hours', true
      ) s
      order by s.seat;
    return;
  end if;

  return query
    with members as (
      select p.id, p.streak_count, p.last_proof_date,
             row_number() over (order by p.squad_joined_at nulls last, p.id) as rn
      from profiles p
      where p.squad_id = v_squad
    )
    select
      chr(64 + m.rn::int),
      m.id = v_uid,
      case when m.last_proof_date >= v_today - 1 then m.streak_count else 0 end,
      coalesce((select sum(l.actual_hrs) from study_logs l where l.user_id = m.id and l.log_date > v_today - 7), 0::numeric),
      (select count(distinct pr.proof_date)::int from proofs pr where pr.user_id = m.id and pr.proof_date > v_today - 7),
      coalesce(m.last_proof_date = v_today, false),
      (select max(pr.created_at) from proofs pr where pr.user_id = m.id),
      false
    from members m
    order by m.rn;
end;
$$;

create or replace function public.get_squad_feed(p_limit int default 20)
returns table (occurred_at timestamptz, seat text, is_me boolean, kind text, detail text, is_sample boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_squad uuid;
  v_demo boolean;
begin
  select squad_id, is_demo into v_squad, v_demo from profiles where id = v_uid;
  if v_squad is null then
    return;
  end if;

  return query
    with members as (
      select p.id,
             case when v_demo then 'D'
                  else chr(64 + (row_number() over (order by p.squad_joined_at nulls last, p.id))::int) end as seat
      from profiles p where p.squad_id = v_squad
    ),
    events as (
      select pr.created_at as occurred_at, m.seat, m.id = v_uid as is_me, 'proof'::text as kind, pr.proof_type as detail, false as is_sample
      from proofs pr join members m on m.id = pr.user_id
      where pr.created_at > now() - interval '7 days'
      union all
      select q.completed_at, m.seat, m.id = v_uid, 'quiz', q.score::text, false
      from quizzes q join members m on m.id = q.user_id
      where q.completed_at > now() - interval '7 days'
      union all
      select s.created_at, m.seat, m.id = v_uid, 'study', s.minutes::text, false
      from study_sessions s join members m on m.id = s.user_id
      where s.created_at > now() - interval '7 days'
      union all
      select e.at, e.s, false, e.k, e.d, true
      from (values
        (now() - interval '45 minutes', 'B', 'proof', 'text'),
        (now() - interval '2 hours', 'A', 'proof', 'photo'),
        (now() - interval '3 hours', 'A', 'study', '90'),
        (now() - interval '4 hours', 'C', 'proof', 'voice'),
        (now() - interval '5 hours', 'B', 'quiz', '80')
      ) as e(at, s, k, d)
      where v_demo
    )
    select ev.occurred_at, ev.seat, ev.is_me, ev.kind, ev.detail, ev.is_sample
    from events ev
    order by ev.occurred_at desc
    limit greatest(least(p_limit, 50), 1);
end;
$$;

-- ---------------------------------------------------------------------------
-- The daily loop
-- ---------------------------------------------------------------------------

create or replace function public.complete_task(
  p_task_index int,
  p_minutes int,
  p_notes text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := ist_today();
  v_plan daily_plans%rowtype;
  v_task jsonb;
  v_planned numeric;
  v_actual numeric;
  v_topic uuid;
  v_exam text;
  v_mastery int;
  v_count int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 960 then
    raise exception 'invalid_minutes';
  end if;

  select * into v_plan from daily_plans where user_id = v_uid and plan_date = v_today for update;
  if not found then
    raise exception 'no_plan_today';
  end if;

  v_task := v_plan.tasks -> 'tasks' -> p_task_index;
  if v_task is null then
    raise exception 'unknown_task';
  end if;

  if coalesce((v_task ->> 'completed')::boolean, false) then
    return jsonb_build_object('already_completed', true, 'completed_count', v_plan.completed_count);
  end if;

  v_task := v_task || jsonb_build_object('completed', true, 'minutes_spent', p_minutes, 'completed_at', now());

  update daily_plans
    set tasks = jsonb_set(tasks, array['tasks', p_task_index::text], v_task),
        completed_count = completed_count + 1
  where id = v_plan.id
  returning completed_count into v_count;

  v_planned := round(coalesce((v_plan.tasks ->> 'total_minutes')::numeric, 0) / 60, 2);
  if v_planned <= 0 then
    select daily_target_hrs into v_planned from profiles where id = v_uid;
  end if;

  insert into study_logs (user_id, log_date, planned_hrs, actual_hrs, topics_covered)
  values (v_uid, v_today, v_planned, round(p_minutes::numeric / 60, 2), jsonb_build_array(v_task ->> 'topic'))
  on conflict (user_id, log_date) do update
    set actual_hrs = least(study_logs.actual_hrs + excluded.actual_hrs, 24),
        topics_covered = coalesce(study_logs.topics_covered, '[]'::jsonb) || excluded.topics_covered
  returning actual_hrs into v_actual;

  insert into study_sessions (user_id, session_date, topic_name, task_text, minutes, notes)
  values (v_uid, v_today, v_task ->> 'topic', v_task ->> 'task', p_minutes, nullif(trim(coalesce(p_notes, '')), ''));

  select exam into v_exam from profiles where id = v_uid;
  select id into v_topic from topics where exam = v_exam and lower(topic_name) = lower(v_task ->> 'topic') limit 1;
  if v_topic is not null then
    update mastery set score = least(score + 2, 100)
    where user_id = v_uid and topic_id = v_topic
    returning score into v_mastery;
  end if;

  update profiles set total_points = total_points + 10 where id = v_uid;

  return jsonb_build_object(
    'completed_count', v_count,
    'actual_hrs', v_actual,
    'mastery_after', v_mastery
  );
end;
$$;

create or replace function public.log_hours(p_hours numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := ist_today();
  v_planned numeric;
  v_actual numeric;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_hours is null or p_hours <= 0 or p_hours > 16 then
    raise exception 'invalid_hours';
  end if;

  select coalesce(
    (select round((tasks ->> 'total_minutes')::numeric / 60, 2) from daily_plans where user_id = v_uid and plan_date = v_today),
    (select daily_target_hrs from profiles where id = v_uid)
  ) into v_planned;

  insert into study_logs (user_id, log_date, planned_hrs, actual_hrs)
  values (v_uid, v_today, v_planned, p_hours)
  on conflict (user_id, log_date) do update
    set actual_hrs = least(study_logs.actual_hrs + excluded.actual_hrs, 24)
  returning actual_hrs into v_actual;

  return v_actual;
end;
$$;

create or replace function public.record_quiz_result(
  p_quiz_id uuid,
  p_answers jsonb,
  p_score_pct int,
  p_delta int,
  p_feedback jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_quiz quizzes%rowtype;
  v_before int;
  v_after int;
begin
  select * into v_quiz from quizzes where id = p_quiz_id and user_id = v_uid for update;
  if not found then
    raise exception 'unknown_quiz';
  end if;
  if v_quiz.completed_at is not null then
    return v_quiz.feedback;
  end if;

  if v_quiz.topic_id is not null then
    select score into v_before from mastery where user_id = v_uid and topic_id = v_quiz.topic_id;
    insert into mastery (user_id, topic_id, score, attempts, last_tested_at)
    values (v_uid, v_quiz.topic_id, greatest(least(coalesce(v_before, 50) + p_delta, 100), 0), 1, now())
    on conflict (user_id, topic_id) do update
      set score = greatest(least(mastery.score + p_delta, 100), 0),
          attempts = mastery.attempts + 1,
          last_tested_at = now()
    returning score into v_after;

    update retests set completed_at = now()
    where user_id = v_uid and topic_id = v_quiz.topic_id and completed_at is null and due_date <= ist_today();
  end if;

  p_feedback := p_feedback || jsonb_build_object('mastery_before', v_before, 'mastery_after', v_after);

  update quizzes
    set user_answers = p_answers,
        score = p_score_pct,
        feedback = p_feedback,
        ai_feedback = p_feedback ->> 'feedback',
        completed_at = now()
  where id = p_quiz_id;

  update profiles set total_points = total_points + 20 where id = v_uid;

  return p_feedback;
end;
$$;

create or replace function public.consume_ai_quota()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bucket timestamptz := date_trunc('hour', now());
  v_calls int;
  v_limit int;
begin
  if v_uid is null then
    return false;
  end if;
  select case when is_demo then 20 else 60 end into v_limit from profiles where id = v_uid;
  insert into ai_usage (user_id, hour_bucket, calls)
  values (v_uid, v_bucket, 1)
  on conflict (user_id, hour_bucket) do update set calls = ai_usage.calls + 1
  returning calls into v_calls;
  delete from ai_usage where user_id = v_uid and hour_bucket < now() - interval '2 days';
  return v_calls <= coalesce(v_limit, 60);
end;
$$;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_squad uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select squad_id into v_squad from public.profiles where id = v_uid;
  if v_squad is not null then
    update public.squads set member_count = greatest(member_count - 1, 0) where id = v_squad;
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'complete_onboarding(text, int, text, numeric, text[])',
    'get_squad_board()',
    'get_squad_feed(int)',
    'complete_task(int, int, text)',
    'log_hours(numeric)',
    'record_quiz_result(uuid, jsonb, int, int, jsonb)',
    'consume_ai_quota()',
    'delete_my_account()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;
