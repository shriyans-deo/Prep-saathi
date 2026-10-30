-- Anonymous sign-ins exist only for labelled sample accounts. Without this guard, anyone
-- could mint anonymous users and fill the real squads other aspirants depend on.

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
  if (select is_demo from profiles where id = v_uid) then
    raise exception 'sample_accounts_cannot_onboard';
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
