import type { GapPoint } from './data';
import { addDays, istToday } from './dates';
import type { Profile } from '../types/database';

// A streak only survives if the last check-in was today or yesterday.
export function effectiveStreak(profile: Profile | null): number {
  if (!profile?.last_proof_date) return 0;
  return profile.last_proof_date >= addDays(istToday(), -1) ? profile.streak_count : 0;
}

export function checkedInToday(profile: Profile | null): boolean {
  return profile?.last_proof_date === istToday();
}

// Today is still in progress, so its unfinished plan does not count against the gap yet.
export function summarizeGap(points: GapPoint[]) {
  const today = istToday();
  const finished = points.filter((p) => p.log_date !== today);
  const counted = finished.length > 0 ? finished : points;
  const planned = counted.reduce((sum, p) => sum + p.planned_hrs, 0);
  const actual = counted.reduce((sum, p) => sum + p.actual_hrs, 0);
  const gapPct = planned > 0 ? Math.max(0, Math.round(((planned - actual) / planned) * 100)) : 0;
  return { planned: round1(planned), actual: round1(actual), gapPct };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
