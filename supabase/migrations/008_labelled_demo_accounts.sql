-- Labelled sample accounts.
-- "Explore with sample data" signs the visitor in anonymously and calls this function,
-- so each visitor gets a private, disposable copy. Sample rows only ever belong to
-- anonymous users flagged is_demo, and the UI labels them on every screen.

create or replace function public.seed_my_demo_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := ist_today();
  v_exam constant text := 'SSC CGL';
  v_squad uuid;
  v_tsd uuid;
  v_syl uuid;
  v_geo uuid;
  v_doc1 uuid;
  v_doc2 uuid;
  v_quiz_tsd jsonb;
  v_quiz_geo jsonb;
  i int;
  v_planned numeric;
  v_actual numeric;
  v_past_tasks jsonb;
begin
  if v_uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is not true then
    raise exception 'sample_accounts_only';
  end if;
  if exists (select 1 from profiles where id = v_uid and exam is not null) then
    return;
  end if;

  insert into squads (name, exam, member_count, is_demo)
  values ('Sample squad', v_exam, 6, true)
  returning id into v_squad;

  update profiles set
    name = 'Sample Aspirant',
    exam = v_exam,
    attempt_number = 2,
    city_tier = 'tier2',
    daily_target_hrs = 6,
    streak_count = 12,
    total_points = 2450,
    last_proof_date = v_today - 1,
    squad_id = v_squad,
    squad_joined_at = now() - interval '30 days',
    is_demo = true,
    created_at = now() - interval '30 days'
  where id = v_uid;

  insert into mastery (user_id, topic_id, score, attempts, last_tested_at)
  select v_uid, t.id, s.score, s.attempts, now() - (s.days_ago || ' days')::interval
  from (values
    ('Time, Speed and Distance', 32, 3, 2),
    ('Geometry and Mensuration', 35, 2, 5),
    ('Economics', 38, 1, 9),
    ('Number System', 48, 2, 7),
    ('Time and Work', 55, 2, 11),
    ('Cloze Test', 58, 1, 6),
    ('Syllogism', 62, 3, 3),
    ('Indian Polity', 65, 1, 13),
    ('Indian History', 75, 2, 8),
    ('Reading Comprehension', 78, 2, 4),
    ('Profit and Loss', 82, 2, 12),
    ('Coding-Decoding', 88, 1, 10)
  ) as s(topic, score, attempts, days_ago)
  join topics t on t.exam = v_exam and t.topic_name = s.topic;

  select id into v_tsd from topics where exam = v_exam and topic_name = 'Time, Speed and Distance';
  select id into v_syl from topics where exam = v_exam and topic_name = 'Syllogism';
  select id into v_geo from topics where exam = v_exam and topic_name = 'Geometry and Mensuration';

  -- 30 days where the gap narrows from about 60% to about 20%, with three missed days.
  for i in 1..30 loop
    v_planned := 6 + ((i % 3) - 1) * 0.5;
    v_actual := case when i in (27, 22, 16) then 0
                     else round((2.2 + (30 - i)::numeric / 29 * 2.6 + ((i % 4) - 1.5) * 0.15), 1) end;
    insert into study_logs (user_id, log_date, planned_hrs, actual_hrs)
    values (v_uid, v_today - i, v_planned, v_actual);
  end loop;

  v_past_tasks := jsonb_build_array(
    jsonb_build_object('subject', 'Quantitative Aptitude', 'topic', 'Time, Speed and Distance', 'task', 'Practice 15 relative-motion problems', 'minutes', 120, 'type', 'weak_topic', 'why', 'Lowest score in your profile', 'completed', true),
    jsonb_build_object('subject', 'Reasoning', 'topic', 'Syllogism', 'task', 'Solve 20 mixed syllogisms', 'minutes', 90, 'type', 'learning', 'why', 'Due for reinforcement', 'completed', true),
    jsonb_build_object('subject', 'English', 'topic', 'Reading Comprehension', 'task', 'Two passages, timed', 'minutes', 150, 'type', 'revision', 'why', 'Hold your strongest area', 'completed', false)
  );
  for i in 1..7 loop
    insert into daily_plans (user_id, plan_date, tasks, generated_by_ai, source, completed_count)
    values (v_uid, v_today - i,
      jsonb_build_object('tasks', v_past_tasks, 'total_minutes', 360, 'focus_note', 'Start with the weakest topic while focus is highest.'),
      false, 'sample', case when i % 3 = 0 then 1 else 2 end);
  end loop;

  insert into daily_plans (user_id, plan_date, tasks, generated_by_ai, source, completed_count)
  values (v_uid, v_today,
    jsonb_build_object(
      'total_minutes', 360,
      'focus_note', 'Time, Speed and Distance is your lowest score at 32%, so it gets the first and longest block.',
      'tasks', jsonb_build_array(
        jsonb_build_object('subject', 'Reasoning', 'topic', 'Syllogism', 'task', 'Solve 20 "only a few" syllogisms', 'minutes', 90, 'type', 'learning', 'why', 'You are at 62% and tested this 3 days ago', 'mastery_at_plan', 62, 'completed', true, 'minutes_spent', 85),
        jsonb_build_object('subject', 'Quantitative Aptitude', 'topic', 'Time, Speed and Distance', 'task', 'Practice 15 relative-motion train problems', 'minutes', 150, 'type', 'weak_topic', 'why', 'Your lowest score at 32%, last tested 2 days ago', 'mastery_at_plan', 32, 'completed', false),
        jsonb_build_object('subject', 'English', 'topic', 'Reading Comprehension', 'task', 'Two editorial passages, timed', 'minutes', 120, 'type', 'revision', 'why', 'Revision to hold your 78%', 'mastery_at_plan', 78, 'completed', false)
      )
    ),
    false, 'sample', 1);

  insert into study_logs (user_id, log_date, planned_hrs, actual_hrs, topics_covered)
  values (v_uid, v_today, 6, 1.42, '["Syllogism"]'::jsonb);

  v_quiz_tsd := jsonb_build_array(
    jsonb_build_object('q', 'Two trains move in the same direction at speeds v1 and v2 (v1 > v2). What is their relative speed?', 'options', jsonb_build_array('v1 + v2', 'v1 - v2', 'v1 x v2', '(v1 + v2) / 2'), 'answer', 'v1 - v2', 'concept', 'Relative speed in the same direction'),
    jsonb_build_object('q', 'If speed doubles and distance stays the same, the time taken becomes:', 'options', jsonb_build_array('Double', 'Half', 'Four times', 'Unchanged'), 'answer', 'Half', 'concept', 'Inverse relation of speed and time'),
    jsonb_build_object('q', 'To convert km/h to m/s, multiply by:', 'options', jsonb_build_array('5/18', '18/5', '3/8', '8/3'), 'answer', '5/18', 'concept', 'Unit conversion'),
    jsonb_build_object('q', 'A train passes a pole in 10 seconds at 72 km/h. How long is the train?', 'options', jsonb_build_array('150 m', '200 m', '250 m', '300 m'), 'answer', '200 m', 'concept', 'Train crossing a stationary object'),
    jsonb_build_object('q', 'Average speed over two equal distances at speeds u and v is:', 'options', jsonb_build_array('(u + v) / 2', '2uv / (u + v)', 'uv / (u + v)', 'sqrt(uv)'), 'answer', '2uv / (u + v)', 'concept', 'Harmonic mean for average speed')
  );
  v_quiz_geo := jsonb_build_array(
    jsonb_build_object('q', 'The angle in a semicircle is:', 'options', jsonb_build_array('45 degrees', '60 degrees', '90 degrees', '180 degrees'), 'answer', '90 degrees', 'concept', 'Circle theorems'),
    jsonb_build_object('q', 'Two tangents drawn to a circle from one external point are:', 'options', jsonb_build_array('Equal in length', 'Perpendicular', 'Parallel', 'Unrelated'), 'answer', 'Equal in length', 'concept', 'Tangent properties'),
    jsonb_build_object('q', 'Opposite angles of a cyclic quadrilateral add up to:', 'options', jsonb_build_array('90 degrees', '180 degrees', '270 degrees', '360 degrees'), 'answer', '180 degrees', 'concept', 'Cyclic quadrilaterals'),
    jsonb_build_object('q', 'The volume of a cone is:', 'options', jsonb_build_array('pi r^2 h', '(1/3) pi r^2 h', '(4/3) pi r^3', '2 pi r h'), 'answer', '(1/3) pi r^2 h', 'concept', 'Mensuration of solids'),
    jsonb_build_object('q', 'The surface area of a sphere is:', 'options', jsonb_build_array('2 pi r^2', '3 pi r^2', '4 pi r^2', '(4/3) pi r^3'), 'answer', '4 pi r^2', 'concept', 'Mensuration of solids')
  );

  insert into documents (user_id, filename, storage_path, extracted_text, ai_summary, detected_topics, weak_topic_overlap, suggested_tasks, quiz, difficulty, processed, created_at)
  values (v_uid, 'Sample - Maths notes, Speed and Time.pdf', 'sample/maths-notes.pdf',
    'Sample document text: relative speed, trains crossing, average speed.',
    'Covers relative speed in same and opposite directions, trains crossing platforms, and 15 solved questions. Written for SSC CGL Tier 1 level.',
    '["Time, Speed and Distance"]'::jsonb, '["Time, Speed and Distance"]'::jsonb,
    '[{"task":"Work through pages 1-4 and solve the 12 relative-speed examples","minutes":40,"why":"Covers your weakest topic at 32%"}]'::jsonb,
    v_quiz_tsd, 'intermediate', true, now() - interval '2 days')
  returning id into v_doc1;

  insert into documents (user_id, filename, storage_path, extracted_text, ai_summary, detected_topics, weak_topic_overlap, suggested_tasks, quiz, difficulty, processed, created_at)
  values (v_uid, 'Sample - Geometry handout.pdf', 'sample/geometry-handout.pdf',
    'Sample document text: circle tangents, cyclic quadrilaterals, cone and sphere volumes.',
    'Formulas and shortcuts for circle tangents, cyclic quadrilaterals, and cone and sphere volumes. Mostly revision with few worked examples.',
    '["Geometry and Mensuration"]'::jsonb, '["Geometry and Mensuration"]'::jsonb,
    '[{"task":"Memorise the circle theorems and solve 8 diagram questions","minutes":35,"why":"Targets your 35% in Geometry"}]'::jsonb,
    v_quiz_geo, 'intermediate', true, now() - interval '5 days')
  returning id into v_doc2;

  insert into quizzes (user_id, topic_id, topic_name, source_document_id, questions, user_answers, score, ai_feedback, feedback, created_at, completed_at)
  select v_uid, q.topic, q.name, q.doc, q.questions, '[]'::jsonb, q.score, q.note,
    jsonb_build_object('score', q.score / 20, 'total', 5, 'concept_gap', q.gap, 'feedback', q.note, 'mastery_delta', q.delta, 'source', 'sample'),
    now() - (q.days_ago || ' days')::interval, now() - (q.days_ago || ' days')::interval
  from (values
    (v_tsd, 'Time, Speed and Distance', v_doc1, v_quiz_tsd, 40, 'Relative motion in the same direction', 'You added speeds where you should subtract. Same-direction problems need v1 - v2.', -5, 24),
    (v_geo, 'Geometry and Mensuration', v_doc2, v_quiz_geo, 60, 'Mensuration of solids', 'Circle theorems are sound, but you mix up the cone and sphere formulas.', 2, 16),
    (v_syl, 'Syllogism', null::uuid, v_quiz_tsd, 60, 'The "only a few" statement form', 'You treat "only a few" like "some". It also means that not all are.', 2, 8),
    (v_tsd, 'Time, Speed and Distance', v_doc1, v_quiz_tsd, 80, 'Harmonic mean for average speed', 'Relative speed is fixed. The remaining slip is averaging speeds over equal distances.', 7, 2)
  ) as q(topic, name, doc, questions, score, gap, note, delta, days_ago);

  for i in 1..12 loop
    insert into proofs (user_id, proof_date, proof_type, content_text, ai_verdict, created_at)
    values (v_uid, v_today - i, 'text',
      'Sample log: ' || (array['Solved 15 relative-speed problems', 'Finished 20 syllogisms, 18 correct', 'Two timed reading passages', 'Revised Articles 14 to 32'])[(i % 4) + 1],
      'Sample note: consistent with the plan for that day.',
      (v_today - i)::timestamp + interval '15 hours 30 minutes');
  end loop;

  insert into retests (user_id, topic_id, topic_name, due_date)
  values (v_uid, v_syl, 'Syllogism', v_today + 1);

  insert into plan_queue (user_id, target_date, source, task)
  values (v_uid, v_today + 1, 'document',
    '{"subject":"Quantitative Aptitude","topic":"Geometry and Mensuration","task":"Memorise the circle theorems and solve 8 diagram questions","minutes":35,"type":"remedial","why":"From your Geometry handout"}'::jsonb);

  insert into weekly_reflections (user_id, week_start, headline, pattern, win, next_week_focus, source)
  values (v_uid, v_today - ((extract(isodow from v_today)::int - 1)),
    (select 'Sample: you planned ' || round(sum(planned_hrs), 1) || ' hours and executed ' || round(sum(actual_hrs), 1)
     from study_logs where user_id = v_uid and log_date between v_today - 7 and v_today - 1),
    'Your gap concentrates on Thursday and Friday evenings.',
    'Time, Speed and Distance went from 40% to 80% across two quizzes.',
    'Protect a fixed evening block on Thursday and Friday.',
    'sample');
end;
$$;

revoke execute on function public.seed_my_demo_account() from public, anon;
grant execute on function public.seed_my_demo_account() to authenticated;

-- Sample accounts expire after two days so the auth table does not fill up.
create or replace function public.purge_stale_demo_accounts()
returns int language plpgsql security definer set search_path = public, auth as $$
declare
  v_count int;
begin
  with doomed as (
    delete from auth.users u
    where u.is_anonymous and u.created_at < now() - interval '2 days'
    returning u.id
  )
  select count(*) into v_count from doomed;
  delete from squads s
  where s.is_demo and not exists (select 1 from profiles p where p.squad_id = s.id);
  return v_count;
end;
$$;
revoke execute on function public.purge_stale_demo_accounts() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('purge-stale-demo-accounts', '30 20 * * *', 'select public.purge_stale_demo_accounts()');
exception when others then
  raise notice 'pg_cron unavailable, stale demo accounts will not auto-purge: %', sqlerrm;
end $$;
