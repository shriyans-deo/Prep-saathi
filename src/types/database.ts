// Row types for the PrepSaathi schema. See supabase/migrations for the source of truth.

export interface Profile {
  id: string;
  name: string;
  exam: string | null;
  attempt_number: number;
  city_tier: string | null;
  daily_target_hrs: number;
  streak_count: number;
  total_points: number;
  squad_id: string | null;
  language_pref: 'en' | 'hi';
  last_proof_date: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface Squad {
  id: string;
  name: string;
  exam: string;
  member_count: number;
  is_demo: boolean;
}

export interface Topic {
  id: string;
  exam: string;
  subject: string;
  topic_name: string;
  difficulty: string;
}

export type MasteryStatus = 'weak' | 'learning' | 'mastered';

export interface MasteryRow {
  score: number;
  status: MasteryStatus;
  attempts: number;
  last_tested_at: string | null;
  topic_id: string;
  topics: { id: string; subject: string; topic_name: string };
}

export type TaskType = 'weak_topic' | 'learning' | 'revision' | 'retest' | 'remedial';

export interface PlanTask {
  subject: string;
  topic: string;
  task: string;
  minutes: number;
  type: TaskType;
  why: string;
  mastery_at_plan?: number | null;
  completed?: boolean;
  minutes_spent?: number;
  completed_at?: string;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string;
  tasks: {
    tasks: PlanTask[];
    total_minutes: number;
    focus_note: string;
    adaptation_note?: string | null;
    regenerated?: boolean;
  };
  generated_by_ai: boolean;
  source: 'ai' | 'rules' | 'sample';
  completed_count: number;
}

export interface StudyLog {
  log_date: string;
  planned_hrs: number;
  actual_hrs: number;
}

export interface Proof {
  id: string;
  proof_date: string;
  proof_type: 'photo' | 'voice' | 'text';
  content_url: string | null;
  content_text: string | null;
  ai_verdict: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: string;
  concept: string;
}

export interface QuizFeedback {
  score: number;
  total: number;
  score_pct?: number;
  concept_gap: string | null;
  feedback: string;
  mastery_delta: number;
  remedial_task: { task: string; minutes: number } | null;
  retest_in_days?: number;
  source: 'ai' | 'rules' | 'sample';
  mastery_before?: number | null;
  mastery_after?: number | null;
}

export interface Quiz {
  id: string;
  topic_id: string | null;
  topic_name: string | null;
  source_document_id: string | null;
  questions: QuizQuestion[];
  score?: number | null;
  feedback?: QuizFeedback | null;
  completed_at?: string | null;
  created_at?: string;
}

export interface SuggestedTask {
  task: string;
  minutes: number;
  why: string;
}

export interface LibraryDocument {
  id: string;
  filename: string;
  storage_path: string;
  ai_summary: string | null;
  detected_topics: string[] | null;
  weak_topic_overlap: string[] | null;
  suggested_tasks: SuggestedTask[] | null;
  quiz: QuizQuestion[] | null;
  difficulty: string | null;
  processed: boolean;
  process_error: string | null;
  created_at: string;
}

export interface Retest {
  id: string;
  topic_id: string | null;
  topic_name: string;
  due_date: string;
}

export interface QueuedTask {
  id: string;
  target_date: string;
  source: 'document' | 'quiz';
  task: PlanTask;
}

export interface WeeklyReflection {
  id: string;
  week_start: string;
  headline: string;
  pattern: string;
  win: string;
  next_week_focus: string;
  source: 'ai' | 'rules' | 'sample';
}

export interface SquadMember {
  seat: string;
  is_me: boolean;
  streak: number;
  hours_week: number;
  checkins_week: number;
  checked_in_today: boolean;
  last_checkin_at: string | null;
  is_sample: boolean;
}

export interface SquadEvent {
  occurred_at: string;
  seat: string;
  is_me: boolean;
  kind: 'proof' | 'quiz' | 'study';
  detail: string;
  is_sample: boolean;
}
