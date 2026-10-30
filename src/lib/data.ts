import { supabase } from './supabase';
import { invokeAI } from './ai';
import { addDays, istToday } from './dates';
import type {
  DailyPlan,
  LibraryDocument,
  MasteryRow,
  PlanTask,
  Proof,
  QueuedTask,
  Quiz,
  QuizFeedback,
  Retest,
  Squad,
  SquadEvent,
  SquadMember,
  StudyLog,
  SuggestedTask,
  Topic,
  WeeklyReflection,
} from '../types/database';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

// ---- Plan -----------------------------------------------------------------

// Reads today's plan straight from the database, which is fast. The edge function, which
// can take seconds, only runs on the first load of the day when no plan exists yet.
export async function fetchTodayPlan(): Promise<DailyPlan> {
  const { data } = await supabase.from('daily_plans').select('*').eq('plan_date', istToday()).maybeSingle();
  if (data) return data as DailyPlan;
  return invokeAI<DailyPlan>('daily_plan');
}

export function regeneratePlan() {
  return invokeAI<DailyPlan>('daily_plan', { regenerate: true });
}

export async function completeTask(taskIndex: number, minutes: number, notes: string) {
  return unwrap(
    await supabase.rpc('complete_task', { p_task_index: taskIndex, p_minutes: minutes, p_notes: notes })
  ) as { completed_count?: number; actual_hrs?: number; mastery_after?: number | null; already_completed?: boolean };
}

export async function logHours(hours: number) {
  return unwrap(await supabase.rpc('log_hours', { p_hours: hours })) as number;
}

export async function fetchTomorrowQueue(userId: string): Promise<QueuedTask[]> {
  return unwrap(
    await supabase
      .from('plan_queue')
      .select('id, target_date, source, task')
      .eq('user_id', userId)
      .is('consumed_at', null)
      .order('created_at')
  ) as QueuedTask[];
}

export async function queueForTomorrow(userId: string, source: 'document' | 'quiz', task: PlanTask) {
  unwrap(
    await supabase.from('plan_queue').insert({
      user_id: userId,
      target_date: addDays(istToday(), 1),
      source,
      task,
    })
  );
}

export async function removeFromQueue(id: string) {
  unwrap(await supabase.from('plan_queue').delete().eq('id', id));
}

// ---- Logs -----------------------------------------------------------------

export async function fetchStudyLogs(userId: string, days = 31): Promise<StudyLog[]> {
  const rows = unwrap(
    await supabase
      .from('study_logs')
      .select('log_date, planned_hrs, actual_hrs')
      .eq('user_id', userId)
      .gte('log_date', addDays(istToday(), -(days - 1)))
      .order('log_date')
  ) as StudyLog[];
  return rows.map((r) => ({ ...r, planned_hrs: Number(r.planned_hrs), actual_hrs: Number(r.actual_hrs) }));
}

export interface GapPoint extends StudyLog {
  gap_hrs: number;
}

// One point per day since the account started. A day with no log counts as 0 hours done
// against the daily target, because a skipped day is exactly what the gap should show.
export function buildGapSeries(logs: StudyLog[], days: number, dailyTarget: number, createdAt: string): GapPoint[] {
  const today = istToday();
  const start = addDays(today, -(days - 1));
  const joined = createdAt.slice(0, 10);
  const first = joined > start ? joined : start;
  const byDate = new Map(logs.map((l) => [l.log_date, l]));
  const out: GapPoint[] = [];
  for (let d = first; d <= today; d = addDays(d, 1)) {
    const log = byDate.get(d);
    const planned = log?.planned_hrs ?? dailyTarget;
    const actual = log?.actual_hrs ?? 0;
    out.push({ log_date: d, planned_hrs: planned, actual_hrs: actual, gap_hrs: Math.max(0, planned - actual) });
  }
  return out;
}

// ---- Mastery --------------------------------------------------------------

export async function fetchMastery(userId: string): Promise<MasteryRow[]> {
  return unwrap(
    await supabase
      .from('mastery')
      .select('score, status, attempts, last_tested_at, topic_id, topics(id, subject, topic_name)')
      .eq('user_id', userId)
      .order('score')
  ) as unknown as MasteryRow[];
}

export async function fetchTopicsForExam(exam: string): Promise<Topic[]> {
  return unwrap(await supabase.from('topics').select('*').eq('exam', exam).order('subject').order('topic_name')) as Topic[];
}

export async function fetchExamSubjects(exam: string): Promise<string[]> {
  const rows = unwrap(await supabase.from('topics').select('subject').eq('exam', exam)) as { subject: string }[];
  return [...new Set(rows.map((r) => r.subject))];
}

// ---- Quiz -----------------------------------------------------------------

export function startTopicQuiz(topicId: string) {
  return invokeAI<Quiz>('topic_quiz', { topic_id: topicId });
}

export function startDocumentQuiz(documentId: string) {
  return invokeAI<Quiz>('document_quiz', { document_id: documentId });
}

export function submitQuiz(quizId: string, answers: string[]) {
  return invokeAI<QuizFeedback>('quiz_submit', { quiz_id: quizId, answers });
}

export async function fetchRecentQuizzes(userId: string, limit = 20): Promise<Quiz[]> {
  return unwrap(
    await supabase
      .from('quizzes')
      .select('id, topic_id, topic_name, source_document_id, questions, score, feedback, completed_at, created_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(limit)
  ) as Quiz[];
}

export async function fetchOpenRetests(userId: string): Promise<Retest[]> {
  return unwrap(
    await supabase
      .from('retests')
      .select('id, topic_id, topic_name, due_date')
      .eq('user_id', userId)
      .is('completed_at', null)
      .order('due_date')
  ) as Retest[];
}

export async function scheduleRetest(userId: string, quiz: Quiz, days: number) {
  unwrap(
    await supabase.from('retests').insert({
      user_id: userId,
      topic_id: quiz.topic_id,
      topic_name: quiz.topic_name ?? 'Mixed',
      due_date: addDays(istToday(), days),
      source_quiz_id: quiz.id,
    })
  );
}

// ---- Library --------------------------------------------------------------

export async function fetchDocuments(userId: string): Promise<LibraryDocument[]> {
  return unwrap(
    await supabase
      .from('documents')
      .select('id, filename, storage_path, ai_summary, detected_topics, weak_topic_overlap, suggested_tasks, quiz, difficulty, processed, process_error, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  ) as LibraryDocument[];
}

export async function uploadDocument(userId: string, file: File, extractedText: string): Promise<string> {
  const safeName = file.name.replace(/[^\w.-]+/g, '_');
  const path = `${userId}/${Date.now()}_${safeName}`;
  unwrap(await supabase.storage.from('documents').upload(path, file, { contentType: 'application/pdf' }));
  const row = unwrap(
    await supabase
      .from('documents')
      .insert({ user_id: userId, filename: file.name, storage_path: path, extracted_text: extractedText })
      .select('id')
      .single()
  ) as { id: string };
  return row.id;
}

export function processDocument(documentId: string) {
  return invokeAI<LibraryDocument>('doc_process', { document_id: documentId });
}

export async function deleteDocument(doc: LibraryDocument) {
  if (!doc.storage_path.startsWith('sample/')) {
    await supabase.storage.from('documents').remove([doc.storage_path]);
  }
  unwrap(await supabase.from('documents').delete().eq('id', doc.id));
}

export function suggestedToPlanTask(doc: LibraryDocument, s: SuggestedTask): PlanTask {
  return {
    subject: '',
    topic: doc.weak_topic_overlap?.[0] ?? doc.detected_topics?.[0] ?? doc.filename,
    task: s.task,
    minutes: s.minutes,
    type: 'remedial',
    why: s.why || `From ${doc.filename}`,
  };
}

// ---- Proof ----------------------------------------------------------------

export async function fetchProofs(userId: string, limit = 20): Promise<Proof[]> {
  return unwrap(
    await supabase
      .from('proofs')
      .select('id, proof_date, proof_type, content_url, content_text, ai_verdict, duration_seconds, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
  ) as Proof[];
}

export async function submitProof(
  userId: string,
  input: { type: Proof['proof_type']; text?: string; file?: Blob; extension?: string; durationSeconds?: number }
): Promise<Proof> {
  let contentUrl: string | null = null;
  if (input.file) {
    contentUrl = `${userId}/${Date.now()}.${input.extension ?? 'bin'}`;
    unwrap(await supabase.storage.from('proofs').upload(contentUrl, input.file, { contentType: input.file.type }));
  }
  return unwrap(
    await supabase
      .from('proofs')
      .insert({
        user_id: userId,
        proof_date: istToday(),
        proof_type: input.type,
        content_text: input.text ?? null,
        content_url: contentUrl,
        duration_seconds: input.durationSeconds ?? null,
      })
      .select('id, proof_date, proof_type, content_url, content_text, ai_verdict, duration_seconds, created_at')
      .single()
  ) as Proof;
}

export function checkProof(proofId: string) {
  return invokeAI<{ verdict: string | null; transcript?: string | null }>('proof_check', { proof_id: proofId });
}

export async function signedProofUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('proofs').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// ---- Squad ----------------------------------------------------------------

export async function fetchSquad(squadId: string): Promise<Squad | null> {
  return unwrap(await supabase.from('squads').select('id, name, exam, member_count, is_demo').eq('id', squadId).maybeSingle()) as Squad | null;
}

export async function fetchSquadBoard(): Promise<SquadMember[]> {
  const rows = unwrap(await supabase.rpc('get_squad_board')) as SquadMember[];
  return (rows ?? []).map((m) => ({ ...m, hours_week: Number(m.hours_week) }));
}

export async function fetchSquadFeed(): Promise<SquadEvent[]> {
  return ((unwrap(await supabase.rpc('get_squad_feed', { p_limit: 20 })) as SquadEvent[]) ?? []);
}

// ---- Progress -------------------------------------------------------------

export async function fetchLatestReflection(userId: string): Promise<WeeklyReflection | null> {
  return unwrap(
    await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()
  ) as WeeklyReflection | null;
}

export function generateReflection() {
  return invokeAI<WeeklyReflection>('weekly_summary');
}

export interface WeeklyPoint {
  label: string;
  accuracy: number | null;
  consistency: number;
}

// Real week-by-week accuracy (mean quiz score) and consistency (days with study logged, out of 7).
export function buildWeeklyTrend(logs: StudyLog[], quizzes: Quiz[], weeks = 4): WeeklyPoint[] {
  const today = istToday();
  const points: WeeklyPoint[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = addDays(today, -7 * w);
    const start = addDays(end, -6);
    const inWeek = logs.filter((l) => l.log_date >= start && l.log_date <= end && l.actual_hrs > 0);
    const scores = quizzes
      .filter((q) => q.completed_at && q.completed_at.slice(0, 10) >= start && q.completed_at.slice(0, 10) <= end)
      .map((q) => q.score ?? 0);
    points.push({
      label: start,
      accuracy: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      consistency: Math.round((inWeek.length / 7) * 100),
    });
  }
  return points;
}

// ---- Account --------------------------------------------------------------

export async function updateProfile(userId: string, patch: Record<string, unknown>) {
  unwrap(await supabase.from('profiles').update(patch).eq('id', userId));
}

export async function completeOnboarding(input: {
  exam: string;
  attempt: number;
  cityTier: string;
  dailyTarget: number;
  weakSubjects: string[];
}) {
  unwrap(
    await supabase.rpc('complete_onboarding', {
      p_exam: input.exam,
      p_attempt: input.attempt,
      p_city_tier: input.cityTier,
      p_daily_target: input.dailyTarget,
      p_weak_subjects: input.weakSubjects,
    })
  );
}

export async function deleteMyAccount(userId: string) {
  for (const bucket of ['documents', 'proofs']) {
    const { data } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
    if (data?.length) {
      await supabase.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
    }
  }
  unwrap(await supabase.rpc('delete_my_account'));
}
