-- Trigger 1: Bump streak and points when proof is submitted
-- Spec reference: §4

create or replace function bump_streak() returns trigger as $$
begin
  update profiles
    set streak_count = streak_count + 1,
        total_points = total_points + 50
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_proof_insert
  after insert on proofs
  for each row execute function bump_streak();

-- Trigger 2: Recompute mastery status from score after quiz update
-- <40 = weak, 40-70 = learning, >70 = mastered
-- Spec reference: §4

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

create trigger on_mastery_score_change
  before update of score on mastery
  for each row execute function recompute_mastery_status();
