// Database types matching the PrepSaathi schema (§3 of spec)

export interface Profile {
  id: string;
  name: string;
  exam: string;
  attempt_number: number;
  city_tier: string | null;
  daily_target_hrs: number;
  streak_count: number;
  total_points: number;
  squad_id: string | null;
  language_pref: 'en' | 'hi';
  created_at: string;
}

export interface Squad {
  id: string;
  name: string;
  exam: string;
  member_count: number;
  created_at: string;
}

export interface Topic {
  id: string;
  exam: string;
  subject: string;
  topic_name: string;
  difficulty: string;
}

export interface Mastery {
  id: string;
  user_id: string;
  topic_id: string;
  score: number;
  status: 'weak' | 'learning' | 'mastered';
  attempts: number;
  last_tested_at: string | null;
  updated_at: string;
}

export interface MasteryWithTopic extends Mastery {
  topics: Topic;
}

export interface DailyPlanTask {
  subject: string;
  topic: string;
  task: string;
  minutes: number;
  type: 'weak_topic' | 'learning' | 'revision';
  why: string;
  completed?: boolean;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string;
  tasks: {
    tasks: DailyPlanTask[];
    total_minutes: number;
    focus_note: string;
  };
  generated_by_ai: boolean;
  completed_count: number;
  created_at: string;
}

export interface StudyLog {
  id: string;
  user_id: string;
  log_date: string;
  planned_hrs: number;
  actual_hrs: number;
  topics_covered: string[] | null;
  created_at: string;
}

export interface Proof {
  id: string;
  user_id: string;
  proof_date: string;
  proof_type: 'photo' | 'voice' | 'text';
  content_url: string | null;
  content_text: string | null;
  ai_verdict: string | null;
  created_at: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: string;
  concept: string;
}

export interface Quiz {
  id: string;
  user_id: string;
  topic_id: string | null;
  source_document_id: string | null;
  questions: QuizQuestion[];
  user_answers: string[] | null;
  score: number | null;
  ai_feedback: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  extracted_text: string | null;
  ai_summary: string | null;
  detected_topics: string[] | null;
  weak_topic_overlap: string[] | null;
  suggested_tasks: { task: string; minutes: number; why: string }[] | null;
  processed: boolean;
  created_at: string;
}

// AI response types
export interface DailyPlanAIResponse {
  tasks: DailyPlanTask[];
  total_minutes: number;
  focus_note: string;
}

export interface QuizFeedbackAIResponse {
  score: number;
  concept_gap: string;
  feedback: string;
  mastery_delta: number;
  remedial_task: { task: string; minutes: number };
  retest_in_days: number;
}

export interface DocSuggestAIResponse {
  summary: string;
  detected_topics: string[];
  difficulty: string;
  overlaps_weak_topics: string[];
  suggested_tasks: { task: string; minutes: number; why: string }[];
  quiz: QuizQuestion[];
}

export interface WeeklySummaryAIResponse {
  headline: string;
  pattern: string;
  win: string;
  next_week_focus: string;
}

// Supabase Database type helper (simplified)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; name: string; exam: string }; Update: Partial<Profile> };
      squads: { Row: Squad; Insert: Partial<Squad>; Update: Partial<Squad> };
      topics: { Row: Topic; Insert: Partial<Topic>; Update: Partial<Topic> };
      mastery: { Row: Mastery; Insert: Partial<Mastery> & { user_id: string; topic_id: string }; Update: Partial<Mastery> };
      daily_plans: { Row: DailyPlan; Insert: Partial<DailyPlan> & { user_id: string; plan_date: string; tasks: DailyPlan['tasks'] }; Update: Partial<DailyPlan> };
      study_logs: { Row: StudyLog; Insert: Partial<StudyLog> & { user_id: string; log_date: string; planned_hrs: number; actual_hrs: number }; Update: Partial<StudyLog> };
      proofs: { Row: Proof; Insert: Partial<Proof> & { user_id: string; proof_date: string; proof_type: string }; Update: Partial<Proof> };
      quizzes: { Row: Quiz; Insert: Partial<Quiz> & { user_id: string; questions: QuizQuestion[] }; Update: Partial<Quiz> };
      documents: { Row: Document; Insert: Partial<Document> & { user_id: string; filename: string; storage_path: string }; Update: Partial<Document> };
    };
  };
}
