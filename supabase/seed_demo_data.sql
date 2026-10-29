-- PrepSaathi Demo Account Seed Script
-- Spec reference: §9 Seed data
-- Can be executed to seed realistic, narrative demonstration data for a target user ID.

create or replace function seed_demo_data_for_user(target_user_id uuid)
returns void as $$
declare
  v_squad_id uuid;
  v_topic_tsd uuid;
  v_topic_geom uuid;
  v_topic_econ uuid;
  v_topic_num uuid;
  v_topic_work uuid;
  v_topic_syl uuid;
  v_topic_cloze uuid;
  v_topic_polity uuid;
  v_topic_profit uuid;
  v_topic_coding uuid;
  v_topic_rc uuid;
  v_topic_hist uuid;
  v_doc1_id uuid;
  v_doc2_id uuid;
  i int;
  d date;
  v_planned numeric;
  v_actual numeric;
begin
  -- 1. Create or retrieve an exam squad (§9)
  select id into v_squad_id from squads where name = 'SSC CGL Mission 2026' limit 1;
  if v_squad_id is null then
    insert into squads (name, exam, member_count)
    values ('SSC CGL Mission 2026', 'SSC CGL', 6)
    returning id into v_squad_id;
  end if;

  -- 2. Update/create user profile (§9: streak_count 12, total_points 2450)
  update profiles
  set
    name = coalesce(name, 'Priya Sharma'),
    exam = 'SSC CGL',
    attempt_number = 2,
    city_tier = 'tier2',
    daily_target_hrs = 6,
    streak_count = 12,
    total_points = 2450,
    squad_id = v_squad_id,
    language_pref = 'en'
  where id = target_user_id;

  -- 3. Lookup topic IDs from seeded topics
  select id into v_topic_tsd from topics where topic_name = 'Time, Speed and Distance' limit 1;
  select id into v_topic_geom from topics where topic_name = 'Geometry and Mensuration' limit 1;
  select id into v_topic_econ from topics where topic_name = 'Economics' limit 1;
  select id into v_topic_num from topics where topic_name = 'Number System' limit 1;
  select id into v_topic_work from topics where topic_name = 'Time and Work' limit 1;
  select id into v_topic_syl from topics where topic_name = 'Syllogism' limit 1;
  select id into v_topic_cloze from topics where topic_name = 'Cloze Test' limit 1;
  select id into v_topic_polity from topics where topic_name = 'Indian Polity' limit 1;
  select id into v_topic_profit from topics where topic_name = 'Profit and Loss' limit 1;
  select id into v_topic_coding from topics where topic_name = 'Coding-Decoding' limit 1;
  select id into v_topic_rc from topics where topic_name = 'Reading Comprehension' limit 1;
  select id into v_topic_hist from topics where topic_name = 'Indian History' limit 1;

  -- 4. Seed Mastery (§9: 12 topics: 3 red <40, 5 amber 40-70, 4 green >70)
  if v_topic_tsd is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_tsd, 32, 'weak', 5, now() - interval '1 day')
    on conflict (user_id, topic_id) do update set score = 32, status = 'weak';
  end if;

  if v_topic_geom is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_geom, 35, 'weak', 4, now() - interval '3 days')
    on conflict (user_id, topic_id) do update set score = 35, status = 'weak';
  end if;

  if v_topic_econ is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_econ, 38, 'weak', 3, now() - interval '4 days')
    on conflict (user_id, topic_id) do update set score = 38, status = 'weak';
  end if;

  if v_topic_num is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_num, 48, 'learning', 6, now() - interval '2 days')
    on conflict (user_id, topic_id) do update set score = 48, status = 'learning';
  end if;

  if v_topic_work is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_work, 55, 'learning', 5, now() - interval '2 days')
    on conflict (user_id, topic_id) do update set score = 55, status = 'learning';
  end if;

  if v_topic_syl is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_syl, 62, 'learning', 7, now() - interval '1 day')
    on conflict (user_id, topic_id) do update set score = 62, status = 'learning';
  end if;

  if v_topic_cloze is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_cloze, 58, 'learning', 4, now() - interval '5 days')
    on conflict (user_id, topic_id) do update set score = 58, status = 'learning';
  end if;

  if v_topic_polity is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_polity, 65, 'learning', 6, now() - interval '3 days')
    on conflict (user_id, topic_id) do update set score = 65, status = 'learning';
  end if;

  if v_topic_profit is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_profit, 82, 'mastered', 8, now() - interval '6 days')
    on conflict (user_id, topic_id) do update set score = 82, status = 'mastered';
  end if;

  if v_topic_coding is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_coding, 88, 'mastered', 10, now() - interval '5 days')
    on conflict (user_id, topic_id) do update set score = 88, status = 'mastered';
  end if;

  if v_topic_rc is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_rc, 78, 'mastered', 7, now() - interval '4 days')
    on conflict (user_id, topic_id) do update set score = 78, status = 'mastered';
  end if;

  if v_topic_hist is not null then
    insert into mastery (user_id, topic_id, score, status, attempts, last_tested_at)
    values (target_user_id, v_topic_hist, 75, 'mastered', 8, now() - interval '7 days')
    on conflict (user_id, topic_id) do update set score = 75, status = 'mastered';
  end if;

  -- 5. Seed Study Logs (§9: 30 rows. Planned 5-7h. Executed starts ~2.2h, rises to ~4.8h over last 10 days)
  for i in 0..29 loop
    d := (current_date - i);
    v_planned := 6.0 + round((sin(i::numeric) * 0.5)::numeric, 1);
    
    if i >= 20 then
      -- 20-29 days ago: executed 2.0 to 2.6h (gap ~60%)
      v_actual := round((2.0 + (30 - i) * 0.05 + random() * 0.4)::numeric, 1);
    elsif i >= 10 then
      -- 10-19 days ago: executed 3.0 to 3.8h (gap ~40%)
      v_actual := round((3.0 + (20 - i) * 0.08 + random() * 0.3)::numeric, 1);
    else
      -- Last 10 days: executed 4.5 to 5.2h (gap narrowed to ~20%)
      v_actual := round((4.5 + (10 - i) * 0.06 + random() * 0.3)::numeric, 1);
    end if;

    insert into study_logs (user_id, log_date, planned_hrs, actual_hrs, topics_covered)
    values (
      target_user_id,
      d,
      v_planned,
      v_actual,
      '["Quantitative Aptitude", "Reasoning", "General Awareness"]'::jsonb
    )
    on conflict (user_id, log_date) do update
    set planned_hrs = excluded.planned_hrs,
        actual_hrs = excluded.actual_hrs;
  end loop;

  -- 6. Seed Proofs (§9: 12 proofs matching the 12-day streak)
  delete from proofs where user_id = target_user_id;
  for i in 0..11 loop
    insert into proofs (user_id, proof_date, proof_type, content_text, ai_verdict)
    values (
      target_user_id,
      (current_date - i),
      case when i % 3 = 0 then 'photo' when i % 3 = 1 then 'text' else 'voice' end,
      case when i % 3 = 1 then 'Completed 15 problems on relative velocity and 2 reading comprehension passages.' else null end,
      'Appears to be authentic handwritten practice work, consistent with today''s study targets.'
    );
  end loop;

  -- 7. Seed Quizzes (§9: 4 quizzes, scores 40%, 60%, 60%, 80% — visible improvement)
  delete from quizzes where user_id = target_user_id;
  insert into quizzes (user_id, topic_id, score, questions, user_answers, ai_feedback, created_at)
  values
    (
      target_user_id,
      v_topic_tsd,
      40,
      '[{"q":"Relative speed of two bodies moving in same direction","options":["v1+v2","v1-v2","v1*v2","v1/v2"],"answer":"v1-v2","concept":"Relative Velocity"},{"q":"Speed unit conversion km/h to m/s","options":["5/18","18/5","3/8","8/3"],"answer":"5/18","concept":"Unit Conversion"},{"q":"Distance formula","options":["s*t","s/t","t/s","s+t"],"answer":"s*t","concept":"Basic Kinematics"},{"q":"Average speed formula","options":["(u+v)/2","2uv/(u+v)","uv/(u+v)","sqrt(uv)"],"answer":"2uv/(u+v)","concept":"Harmonic Mean"},{"q":"Train crossing pole time","options":["L/S","S/L","L*S","(L+S)/2"],"answer":"L/S","concept":"Train kinematics"}]'::jsonb,
      '["v1-v2", "18/5", "s*t", "(u+v)/2", "S/L"]'::jsonb,
      'Relative motion and harmonic average speed formulas were misapplied. Concept gap: distinguishing reference frame directions.',
      now() - interval '14 days'
    ),
    (
      target_user_id,
      v_topic_tsd,
      60,
      '[{"q":"Two trains 100m and 120m moving opposite","options":["Add lengths","Subtract lengths","Multiply","Divide"],"answer":"Add lengths","concept":"Relative Length"},{"q":"Speed 54 km/h in m/s","options":["15 m/s","20 m/s","25 m/s","10 m/s"],"answer":"15 m/s","concept":"Unit Conversion"},{"q":"Ratio of speeds 3:4, ratio of times","options":["4:3","3:4","9:16","16:9"],"answer":"4:3","concept":"Inverse Ratio"},{"q":"Man walks 4km in 1 hr, runs 6km in 1 hr","options":["5 km/h","4.8 km/h","5.2 km/h","6 km/h"],"answer":"5 km/h","concept":"Average Speed"},{"q":"Stoppage time formula","options":["(Fast-Slow)/Fast","(Fast-Slow)/Slow","Fast/Slow","Slow/Fast"],"answer":"(Fast-Slow)/Fast","concept":"Train Stoppages"}]'::jsonb,
      '["Add lengths", "15 m/s", "4:3", "4.8 km/h", "Slow/Fast"]'::jsonb,
      'Solid improvement on basic kinematics. Concept gap: calculation of total transit stoppage deductions.',
      now() - interval '8 days'
    ),
    (
      target_user_id,
      v_topic_syl,
      60,
      '[{"q":"All A are B, All B are C","options":["All A are C","Some A are not C","No A is C","None"],"answer":"All A are C","concept":"Universal Affirmative"},{"q":"Some cats are dogs, Some dogs are birds","options":["No conclusion","All cats are birds","Some cats are birds","None"],"answer":"No conclusion","concept":"Particular Fallacy"},{"q":"No man is bird, All birds fly","options":["Some men fly","No man flies","Indeterminate","None"],"answer":"Indeterminate","concept":"Negative Premises"},{"q":"Either or case condition","options":["Complementary pair","Both true","Both false","None"],"answer":"Complementary pair","concept":"Disjunctive Conditions"},{"q":"Only a few A are B","options":["Some A are B and Some A are not B","All A are B","No A is B","None"],"answer":"Some A are B and Some A are not B","concept":"Only A Few"}]'::jsonb,
      '["All A are C", "No conclusion", "No man flies", "Complementary pair", "All A are B"]'::jsonb,
      'Underlying concept gap: modern syllogism qualifiers like "Only a few" vs traditional universal affirmative.',
      now() - interval '4 days'
    ),
    (
      target_user_id,
      v_topic_tsd,
      80,
      '[{"q":"A train 150m crosses bridge 250m at 72 km/h","options":["20s","15s","25s","30s"],"answer":"20s","concept":"Total Distance Crossing"},{"q":"Speed 90 km/h in m/s","options":["25 m/s","30 m/s","20 m/s","35 m/s"],"answer":"25 m/s","concept":"Conversion"},{"q":"Relative speed opposite directions","options":["v1+v2","v1-v2","v1*v2","None"],"answer":"v1+v2","concept":"Opposite Vectors"},{"q":"Circular track meeting point","options":["LCM of times","HCF of times","Product","Difference"],"answer":"LCM of times","concept":"Circular Track Racing"},{"q":"Boats and streams upstream speed","options":["u - v","u + v","uv","u/v"],"answer":"u - v","concept":"Upstream Velocity"}]'::jsonb,
      '["20s", "25 m/s", "v1+v2", "LCM of times", "u + v"]'::jsonb,
      'High accuracy achieved across time and distance! Only remaining friction is vector sign reversal for upstream water flow.',
      now() - interval '1 day'
    );

  -- 8. Seed Daily Plans (§9: 7 days with varied completion counts)
  delete from daily_plans where user_id = target_user_id;
  for i in 0..6 loop
    insert into daily_plans (user_id, plan_date, tasks, completed_count, generated_by_ai)
    values (
      target_user_id,
      (current_date - i),
      jsonb_build_object(
        'tasks', jsonb_build_array(
          jsonb_build_object(
            'subject', 'Quantitative Aptitude',
            'topic', 'Time, Speed and Distance',
            'task', 'Practice 15 relative-motion problems',
            'minutes', 45,
            'type', 'weak_topic',
            'why', 'You scored 32% here on recent diagnostic',
            'completed', (i > 0 or 1 <= 2)
          ),
          jsonb_build_object(
            'subject', 'Reasoning',
            'topic', 'Syllogism',
            'task', 'Solve 20 "Only a few" syllogism sets',
            'minutes', 30,
            'type', 'learning',
            'why', 'Reinforcing test accuracy from 60% to 80%',
            'completed', (i > 0 or 2 <= 2)
          ),
          jsonb_build_object(
            'subject', 'English',
            'topic', 'Reading Comprehension',
            'task', '2 editorial comprehension passages, timed',
            'minutes', 40,
            'type', 'revision',
            'why', 'Maintain your strongest area (78% mastery)',
            'completed', (i > 1)
          )
        ),
        'total_minutes', 115,
        'focus_note', 'Target your weakest relative-motion equations first before moving to verbal reasoning.'
      ),
      case when i = 0 then 2 when i = 1 then 3 when i = 2 then 2 else 3 end,
      true
    );
  end loop;

  -- 9. Seed Documents (§9: 2 pre-processed documents with topics and overlap)
  delete from documents where user_id = target_user_id;
  
  insert into documents (
    user_id, filename, storage_path, extracted_text, ai_summary,
    detected_topics, weak_topic_overlap, suggested_tasks, processed
  )
  values (
    target_user_id,
    'SSC_CGL_Maths_Notes_Time_Speed_Distance.pdf',
    target_user_id || '/SSC_CGL_Maths_Notes_Time_Speed_Distance.pdf',
    'Comprehensive lecture handout covering relative velocity of trains, crossing platforms, average speed derivations, and races.',
    'Covers key formulas for relative speed in opposite and same directions, train crossing formulas, and 15 solved practice questions.',
    '["Time, Speed and Distance", "Relative Speed", "Races"]'::jsonb,
    '["Time, Speed and Distance"]'::jsonb,
    '[{"task": "Work through pages 1-4 and solve 12 relative-speed examples", "minutes": 40, "why": "Covers your weakest topic (32% mastery)"}]'::jsonb,
    true
  )
  returning id into v_doc1_id;

  insert into documents (
    user_id, filename, storage_path, extracted_text, ai_summary,
    detected_topics, weak_topic_overlap, suggested_tasks, processed
  )
  values (
    target_user_id,
    'Geometry_and_Mensuration_Formulas.pdf',
    target_user_id || '/Geometry_and_Mensuration_Formulas.pdf',
    'Detailed theorems on circle tangents, chords, triangle similarities, and 3D mensuration volume/surface area formulas.',
    'Formulas and shortcut approaches for circle tangents, cyclic quadrilaterals, and cone/sphere volume calculations.',
    '["Geometry and Mensuration", "Triangles", "Circles"]'::jsonb,
    '["Geometry and Mensuration"]'::jsonb,
    '[{"task": "Memorize inscribed angle theorems and solve 8 diagram questions", "minutes": 35, "why": "Directly targets weak area (35% mastery)"}]'::jsonb,
    true
  )
  returning id into v_doc2_id;

end;
$$ language plpgsql security definer;
