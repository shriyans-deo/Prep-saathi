import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { invalidate, useQuery } from '../lib/query';
import { supabase } from '../lib/supabase';
import {
  completeTask,
  fetchMastery,
  fetchOpenRetests,
  fetchRecentQuizzes,
  fetchTodayPlan,
  queueForTomorrow,
  scheduleRetest,
  startTopicQuiz,
  submitQuiz,
} from '../lib/data';
import { formatDay, isoDateOf, istToday } from '../lib/dates';
import {
  Bubble,
  Button,
  EmptyState,
  ErrorState,
  Notice,
  PageHeader,
  Panel,
  Skeleton,
  SourceLabel,
  aiErrorMessage,
  cx,
  useToast,
} from '../components/ui';
import type { Quiz, QuizFeedback } from '../types/database';

const LETTERS = ['A', 'B', 'C', 'D'];

function Taking({ quiz, onResult }: { quiz: Quiz; onResult: (result: QuizFeedback) => void }) {
  const { t } = usePrefs();
  const storageKey = `prepsaathi_quiz_${quiz.id}`;

  const [answers, setAnswers] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) ?? '[]');
    } catch {
      return [];
    }
  });
  const [picked, setPicked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const index = answers.length >= quiz.questions.length ? quiz.questions.length - 1 : answers.length;
  const question = quiz.questions[index];
  const isLast = index === quiz.questions.length - 1;
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [index]);

  const remember = (next: string[]) => {
    setAnswers(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Progress then lasts for this visit only.
    }
  };

  const submit = async (finalAnswers: string[]) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitQuiz(quiz.id, finalAnswers);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Nothing to clean up if storage is blocked.
      }
      onResult(result);
    } catch (e) {
      setError(aiErrorMessage(e, t));
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!picked) return;
    if (isLast) {
      const finalAnswers = [...answers.slice(0, index), picked];
      remember(finalAnswers);
      void submit(finalAnswers);
    } else {
      remember([...answers, picked]);
      setPicked(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="font-medium text-print-dark">{quiz.topic_name ?? t('Mixed')}</p>
        <ol className="flex gap-1.5" aria-label={t('Question {n} of {m}', { n: index + 1, m: quiz.questions.length })}>
          {quiz.questions.map((_, i) => (
            <li key={i}>
              <Bubble size={16} filled={i < index} className={i === index ? 'ring-2 ring-print ring-offset-1' : undefined} />
            </li>
          ))}
        </ol>
      </div>

      <h1 ref={heading} tabIndex={-1} className="text-xl sm:text-[1.375rem] leading-snug font-semibold mb-5 outline-none">
        <span className="sr-only">{t('Question {n} of {m}', { n: index + 1, m: quiz.questions.length })}: </span>
        {question.q}
      </h1>

      <fieldset disabled={submitting}>
        <legend className="sr-only">{t('Choose one answer')}</legend>
        <div className="flex flex-col gap-2">
          {question.options.map((option, i) => {
            const selected = picked === option;
            return (
              <label
                key={option}
                className={cx(
                  'flex items-center gap-3 min-h-13 px-3 py-2 rounded-sheet border transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                  selected ? 'border-ink' : 'border-line hover:border-print'
                )}
              >
                <input
                  type="radio"
                  name={`q-${index}`}
                  className="sr-only"
                  checked={selected}
                  onChange={() => setPicked(option)}
                />
                <Bubble filled={selected} size={28} label={LETTERS[i]} />
                <span className="min-w-0">{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {error && <Notice tone="error" className="mt-4">{error}</Notice>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{t('No going back, same as the exam hall.')}</p>
        <Button disabled={!picked} loading={submitting} onClick={next}>
          {submitting ? t('Finding the concept gap...') : isLast ? t('Submit quiz') : t('Next question')}
          {!submitting && <ArrowRight size={18} aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}

function Result({ quiz, result, onAnother }: { quiz: Quiz; result: QuizFeedback; onAnother: () => void }) {
  const { user } = useAuth();
  const { t } = usePrefs();
  const toast = useToast();
  const uid = user!.id;

  const [queued, setQueued] = useState(false);
  const [retestSet, setRetestSet] = useState(false);
  const [busy, setBusy] = useState<'queue' | 'retest' | null>(null);

  const retestDays = result.retest_in_days ?? 3;
  const graded = (result as QuizFeedback & { graded?: { question: string; user_answer: string; correct_answer: string; is_correct: boolean; concept: string }[] }).graded ?? [];

  const addRemedial = async () => {
    if (!result.remedial_task) return;
    setBusy('queue');
    try {
      await queueForTomorrow(uid, 'quiz', {
        subject: '',
        topic: quiz.topic_name ?? 'Mixed',
        task: result.remedial_task.task,
        minutes: result.remedial_task.minutes,
        type: 'remedial',
        why: result.concept_gap ? `Quiz gap: ${result.concept_gap}` : 'From your last quiz',
      });
      invalidate('queue:');
      setQueued(true);
    } catch (e) {
      console.error('Could not queue remedial task:', e);
      toast(t('Could not save. Check your connection and try again.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const setRetest = async () => {
    setBusy('retest');
    try {
      await scheduleRetest(uid, quiz, retestDays);
      invalidate('retests:');
      setRetestSet(true);
    } catch (e) {
      console.error('Could not schedule retest:', e);
      toast(t('Could not save. Check your connection and try again.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-[1.75rem] sm:text-[2.25rem] leading-tight font-bold">
        {t('{n} of {m}.', { n: result.score, m: result.total })}{' '}
        {result.concept_gap && <span className="text-print">{t('The pattern is {concept}.', { concept: result.concept_gap })}</span>}
      </h1>
      <p className="mt-1.5 text-ink-soft">{quiz.topic_name ?? t('Mixed')}</p>
      <p className="mt-3 text-lg leading-relaxed">{result.feedback}</p>
      <div className="mt-2"><SourceLabel source={result.source} /></div>

      {typeof result.mastery_after === 'number' && (
        <Notice className="mt-4">
          {t('{topic} moved from {a}% to {b}%. Tomorrow\'s plan will use this.', {
            topic: quiz.topic_name ?? '',
            a: result.mastery_before ?? 50,
            b: result.mastery_after,
          })}
        </Notice>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {result.remedial_task &&
          (queued ? (
            <span className="inline-flex items-center gap-1.5 min-h-11 font-medium">
              <Check size={18} aria-hidden="true" />
              {t('Remedial task added to tomorrow')}
            </span>
          ) : (
            <Button loading={busy === 'queue'} onClick={addRemedial}>
              {t('Add remedial task to tomorrow')}
            </Button>
          ))}
        {quiz.topic_id &&
          (retestSet ? (
            <span className="inline-flex items-center gap-1.5 min-h-11 font-medium">
              <Check size={18} aria-hidden="true" />
              {t('Retest set for {n} days from now', { n: retestDays })}
            </span>
          ) : (
            <Button variant="print" loading={busy === 'retest'} onClick={setRetest}>
              {t('Retest in {n} days', { n: retestDays })}
            </Button>
          ))}
      </div>

      {result.remedial_task && <p className="mt-2 text-sm text-ink-soft">{result.remedial_task.task}</p>}

      {graded.length > 0 && (
        <details className="mt-6 border-t border-line pt-3">
          <summary className="font-semibold text-print-dark">{t('Review your answers')}</summary>
          <ol className="mt-3 flex flex-col gap-4">
            {graded.map((g, i) => (
              <li key={i}>
                <p className="font-medium">{g.question}</p>
                <p className="mt-1 flex items-start gap-1.5 text-sm">
                  {g.is_correct ? <Check size={16} className="mt-0.5 flex-none" aria-hidden="true" /> : <X size={16} className="mt-0.5 flex-none text-print" aria-hidden="true" />}
                  <span>
                    {t('Your answer: {a}', { a: g.user_answer })}
                    {!g.is_correct && <><br />{t('Correct answer: {a}', { a: g.correct_answer })}</>}
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <Button variant="ghost" onClick={onAnother}>{t('Take another quiz')}</Button>
        <Link to="/plan" className="font-semibold text-print-dark">{t("See today's plan")}</Link>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const uid = user!.id;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const quizId = params.get('id');
  const topicParam = params.get('topic');

  const mastery = useQuery(`mastery:${uid}`, () => fetchMastery(uid));
  const recent = useQuery(`quizzes:${uid}`, () => fetchRecentQuizzes(uid, 30));
  const retests = useQuery(`retests:${uid}`, () => fetchOpenRetests(uid));

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [result, setResult] = useState<QuizFeedback | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [genError, setGenError] = useState<unknown>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // A quiz can be reached by link from the library, or after a reload mid-quiz.
  useEffect(() => {
    if (!quizId || quiz?.id === quizId) return;
    let cancelled = false;
    void supabase
      .from('quizzes')
      .select('id, topic_id, topic_name, source_document_id, questions, score, feedback, completed_at')
      .eq('id', quizId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoadFailed(true);
          return;
        }
        setQuiz(data as Quiz);
        if (data.completed_at && data.feedback) setResult(data.feedback as QuizFeedback);
      });
    return () => {
      cancelled = true;
    };
  }, [quizId, quiz?.id]);

  const begin = async (topicId: string, topicName: string) => {
    setGenerating(topicName);
    setGenError(null);
    try {
      const created = await startTopicQuiz(topicId);
      setQuiz(created);
      setResult(null);
      setParams({ id: created.id }, { replace: true });
    } catch (e) {
      setGenError(e);
    } finally {
      setGenerating(null);
    }
  };

  // ?topic= comes from a due retest on the plan or dashboard.
  const startedFromParam = useRef(false);
  useEffect(() => {
    if (!topicParam || startedFromParam.current || !mastery.data) return;
    const row = mastery.data.find((m) => m.topics.topic_name === topicParam);
    if (row) {
      startedFromParam.current = true;
      void begin(row.topic_id, topicParam);
    }
    // begin only depends on values that are stable for this effect's purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicParam, mastery.data]);

  const finish = async (feedback: QuizFeedback) => {
    setResult(feedback);
    invalidate('mastery:', 'quizzes:', 'retests:', 'plan:', 'squad:');
    // Taking a scheduled retest also fills its bubble on today's plan.
    if (quiz?.topic_name) {
      try {
        const plan = await fetchTodayPlan();
        const index = plan.tasks.tasks.findIndex((x) => x.type === 'retest' && x.topic === quiz.topic_name && !x.completed);
        if (index >= 0) {
          await completeTask(index, plan.tasks.tasks[index].minutes, '');
          invalidate('plan:', 'logs:');
        }
      } catch (e) {
        console.error('Could not mark the retest task:', e);
      }
    }
  };

  const reset = () => {
    setQuiz(null);
    setResult(null);
    setGenError(null);
    setLoadFailed(false);
    startedFromParam.current = false;
    navigate('/quiz', { replace: true });
  };

  const sorted = useMemo(() => mastery.data ?? [], [mastery.data]);
  const visible = showAll ? sorted : sorted.slice(0, 6);
  const dueRetests = (retests.data ?? []).filter((r) => r.due_date <= istToday());
  const laterRetests = (retests.data ?? []).filter((r) => r.due_date > istToday());
  const finished = useMemo(() => (recent.data ?? []).slice(0, 6), [recent.data]);

  if (quizId && loadFailed) {
    return (
      <div className="max-w-md">
        <Notice tone="error">{t('This quiz could not be found.')}</Notice>
        <Button variant="print" className="mt-3" onClick={reset}>{t('Back to quizzes')}</Button>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="max-w-md flex items-start gap-3 py-6" role="status">
        <Loader2 size={22} className="spin text-print mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-semibold">{t('Writing 5 questions on {topic}...', { topic: generating })}</p>
          <p className="text-ink-soft">{t('This usually takes a few seconds.')}</p>
        </div>
      </div>
    );
  }

  if (quiz && result) return <Result quiz={quiz} result={result} onAnother={reset} />;
  if (quiz) return <Taking quiz={quiz} onResult={finish} />;
  if (quizId) return <Skeleton className="h-60 max-w-2xl" />;

  return (
    <div>
      <PageHeader
        title={t('Quiz')}
        sub={t('Five questions on one topic. You get back the concept you are missing, not just a score, and your result changes tomorrow\'s plan.')}
      />

      {genError != null && <Notice tone="error" className="mb-4">{aiErrorMessage(genError, t)}</Notice>}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start">
        <Panel title={t('Your weakest topics first')}>
          {mastery.error && !mastery.data ? (
            <ErrorState error={mastery.error} onRetry={mastery.refetch} />
          ) : mastery.isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            <>
              <ul className="divide-y divide-line">
                {visible.map((m) => (
                  <li key={m.topic_id} className="flex items-center gap-3 py-2 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{m.topics.topic_name}</p>
                      <p className="text-sm text-ink-soft">
                        {m.topics.subject} · {m.attempts === 0 ? t('Starting score {n}%', { n: m.score }) : t('{n}%', { n: m.score })}
                      </p>
                    </div>
                    <Button small variant="print" onClick={() => begin(m.topic_id, m.topics.topic_name)}>
                      {t('Start')}
                    </Button>
                  </li>
                ))}
              </ul>
              {sorted.length > 6 && (
                <Button small variant="ghost" className="mt-2" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? t('Show fewer') : t('Show all {n} topics', { n: sorted.length })}
                </Button>
              )}
            </>
          )}
        </Panel>

        <div className="flex flex-col gap-8">
          {retests.error != null && !retests.data && <ErrorState error={retests.error} onRetry={retests.refetch} />}
          {(dueRetests.length > 0 || laterRetests.length > 0) && (
            <Panel title={t('Retests')}>
              <ul className="divide-y divide-line">
                {dueRetests.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 py-2 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{r.topic_name}</p>
                      <p className="text-sm text-print-dark">{t('Due now')}</p>
                    </div>
                    {r.topic_id && (
                      <Button small onClick={() => begin(r.topic_id!, r.topic_name)}>
                        {t('Start')}
                      </Button>
                    )}
                  </li>
                ))}
                {laterRetests.map((r) => (
                  <li key={r.id} className="py-2 first:pt-0">
                    <p className="font-medium">{r.topic_name}</p>
                    <p className="text-sm text-ink-soft">{t('Due {date}', { date: formatDay(r.due_date, lang) })}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title={t('Recent results')}>
            {recent.error && !recent.data ? (
              <ErrorState error={recent.error} onRetry={recent.refetch} />
            ) : recent.isLoading ? (
              <Skeleton className="h-16" />
            ) : finished.length === 0 ? (
              <EmptyState title={t('No quizzes yet')}>{t('Start with your weakest topic.')}</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {finished.map((q) => (
                  <li key={q.id} className="flex items-baseline gap-2 py-2 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{q.topic_name ?? t('Mixed')}</p>
                      <p className="text-sm text-ink-soft">
                        {q.completed_at && formatDay(isoDateOf(q.completed_at), lang)}
                        {q.feedback?.concept_gap ? ` · ${q.feedback.concept_gap}` : ''}
                      </p>
                    </div>
                    <span className="font-bold">{q.score}%</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
