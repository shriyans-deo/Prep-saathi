import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pause, Play, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { invalidate, setQueryData, useQuery } from '../lib/query';
import { completeTask, fetchMastery, fetchTodayPlan, fetchTomorrowQueue, regeneratePlan, removeFromQueue } from '../lib/data';
import { TaskRow, nextTaskIndex } from '../components/TaskRow';
import {
  Button,
  Dialog,
  ErrorState,
  Field,
  Notice,
  PageHeader,
  Panel,
  Skeleton,
  SourceLabel,
  aiErrorMessage,
  inputClass,
  useToast,
} from '../components/ui';
import type { PlanTask } from '../types/database';

// The running session survives reloads and phone locks, because the time is derived
// from a start timestamp instead of being counted in memory.
type SavedTimer = { index: number; startedAt: number | null; banked: number };

const TIMER_KEY = 'prepsaathi_session';

function readTimer(): SavedTimer | null {
  try {
    return JSON.parse(localStorage.getItem(TIMER_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function writeTimer(timer: SavedTimer | null) {
  try {
    if (timer) localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    else localStorage.removeItem(TIMER_KEY);
  } catch {
    // Without storage the timer still runs for this visit.
  }
}

function elapsedSeconds(timer: SavedTimer): number {
  return timer.banked + (timer.startedAt ? Math.floor((Date.now() - timer.startedAt) / 1000) : 0);
}

function clock(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function StudySession({
  task,
  index,
  onClose,
  onDone,
}: {
  task: PlanTask;
  index: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = usePrefs();
  const toast = useToast();

  const [timer, setTimer] = useState<SavedTimer>(() => {
    const saved = readTimer();
    return saved?.index === index ? saved : { index, startedAt: Date.now(), banked: 0 };
  });
  const [seconds, setSeconds] = useState(() => elapsedSeconds(timer));
  const [notes, setNotes] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [minutesError, setMinutesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    writeTimer(timer);
    setSeconds(elapsedSeconds(timer));
    if (!timer.startedAt) return;
    const tick = setInterval(() => setSeconds(elapsedSeconds(timer)), 1000);
    return () => clearInterval(tick);
  }, [timer]);

  const running = timer.startedAt !== null;
  const toggle = () =>
    setTimer((current) =>
      current.startedAt
        ? { ...current, banked: elapsedSeconds(current), startedAt: null }
        : { ...current, startedAt: Date.now() }
    );

  const beginFinish = () => {
    setTimer((current) => ({ ...current, banked: elapsedSeconds(current), startedAt: null }));
    setMinutes(String(Math.max(1, Math.round(seconds / 60))));
    setFinishing(true);
  };

  const save = async () => {
    const value = Math.round(Number(minutes));
    if (!Number.isFinite(value) || value < 1 || value > 960) {
      setMinutesError(t('Enter a number of minutes between 1 and 960.'));
      return;
    }
    setMinutesError(null);
    setSaving(true);
    try {
      const result = await completeTask(index, value, notes);
      writeTimer(null);
      invalidate('plan:', 'logs:', 'mastery:', 'squad:');
      toast(
        typeof result.mastery_after === 'number'
          ? t('Marked. {n} min logged, {topic} is now {score}%.', { n: value, topic: task.topic, score: result.mastery_after })
          : t('Marked. {n} min logged.', { n: value })
      );
      onDone();
    } catch (e) {
      console.error('Could not complete task:', e);
      toast(t('Could not save. Check your connection and try again.'), 'error');
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-ink mb-4">
        {task.task}
        {task.subject && <span className="text-ink-soft"> · {task.subject}</span>}
      </p>

      {!finishing ? (
        <>
          <div className="text-center py-4 border-y border-line mb-4">
            <div className="text-[3.5rem] leading-none font-bold tabular-nums" role="timer" aria-label={t('Time studied')}>
              {clock(seconds)}
            </div>
            <p className="text-sm text-ink-soft mt-1">{t('Planned: {n} min', { n: task.minutes })}</p>
            <Button variant="print" small className="mt-3" onClick={toggle}>
              {running ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              {running ? t('Pause') : t('Resume')}
            </Button>
          </div>

          <Field label={t('Notes (optional)')}>
            <textarea
              className={`${inputClass} resize-y`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('Question numbers, formulas, where you got stuck')}
            />
          </Field>

          <div className="flex flex-wrap justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={onClose}>
              {t('Keep running and close')}
            </Button>
            <Button onClick={beginFinish}>{t('Mark done')}</Button>
          </div>
        </>
      ) : (
        <>
          <Field label={t('How many minutes did you actually study?')} hint={t('This is what counts towards your gap, so keep it honest.')} error={minutesError}>
            <input
              className={inputClass}
              type="number"
              inputMode="numeric"
              min="1"
              max="960"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setFinishing(false)}>
              {t('Back')}
            </Button>
            <Button loading={saving} onClick={save}>
              {t('Save and fill the bubble')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function PlanPage() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const toast = useToast();
  const uid = user!.id;
  const [params, setParams] = useSearchParams();

  const plan = useQuery('plan:today', fetchTodayPlan);
  const mastery = useQuery(`mastery:${uid}`, () => fetchMastery(uid));
  const queue = useQuery(`queue:${uid}`, () => fetchTomorrowQueue(uid));

  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const tasks = useMemo(() => plan.data?.tasks.tasks ?? [], [plan.data]);
  const nextIndex = nextTaskIndex(tasks);
  const doneMinutes = tasks.filter((x) => x.completed).reduce((s, x) => s + (x.minutes_spent ?? x.minutes), 0);
  const totalMinutes = plan.data?.tasks.total_minutes ?? 0;
  const pct = totalMinutes > 0 ? Math.min(100, Math.round((doneMinutes / totalMinutes) * 100)) : 0;

  const scoreByTopic = useMemo(
    () => new Map((mastery.data ?? []).map((m) => [m.topics.topic_name, m.score])),
    [mastery.data]
  );

  // ?start=<index> opens the session; a timer left running reopens on its own.
  const startParam = params.get('start');
  const activeIndex = startParam !== null ? Number(startParam) : null;
  const activeTask = activeIndex !== null && tasks[activeIndex] && !tasks[activeIndex].completed ? tasks[activeIndex] : null;
  const [resumable, setResumable] = useState<SavedTimer | null>(() => readTimer());

  const closeSession = useCallback(() => {
    setParams({}, { replace: true });
    setResumable(readTimer());
  }, [setParams]);

  const regenerate = async () => {
    setRegenerating(true);
    setRegenError(null);
    try {
      const next = await regeneratePlan();
      setQueryData('plan:today', next);
      invalidate('logs:', 'queue:');
      toast(t('Plan rewritten from your latest scores.'));
    } catch (e) {
      setRegenError(aiErrorMessage(e, t));
    } finally {
      setRegenerating(false);
    }
  };

  const removeQueued = async (id: string) => {
    try {
      await removeFromQueue(id);
      invalidate('queue:');
    } catch (e) {
      console.error('Could not remove queued task:', e);
      toast(t('Could not save. Check your connection and try again.'), 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title={t("Today's plan")}
        sub={plan.data?.tasks.focus_note || undefined}
        action={
          <div className="flex flex-col sm:items-end gap-1">
            <Button variant="print" loading={regenerating} onClick={regenerate} disabled={!plan.data}>
              {!regenerating && <RefreshCw size={16} aria-hidden="true" />}
              {t('Regenerate plan')}
            </Button>
            <span className="text-sm text-ink-soft">{t("Uses yesterday's completion")}</span>
          </div>
        }
      />

      {regenError && <Notice tone="error" className="mb-4">{regenError}</Notice>}

      {plan.data?.tasks.adaptation_note && <Notice className="mb-4">{plan.data.tasks.adaptation_note}</Notice>}

      {resumable && !activeTask && tasks[resumable.index] && !tasks[resumable.index].completed && (
        <Notice
          className="mb-4"
          action={
            <Button small onClick={() => setParams({ start: String(resumable.index) })}>
              {t('Back to timer')}
            </Button>
          }
        >
          {t('Your timer for {topic} is still running.', { topic: tasks[resumable.index].topic })}
        </Notice>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-start">
        <Panel>
          {plan.error && !plan.data ? (
            <ErrorState error={plan.error} onRetry={plan.refetch} />
          ) : plan.isLoading ? (
            <div className="flex flex-col gap-3" role="status" aria-label={t('Building your plan...')}>
              <p className="text-ink-soft">{t('Building your plan from your scores...')}</p>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            <>
              <ul className="divide-y divide-line">
                {tasks.map((task, i) => (
                  <TaskRow
                    key={`${task.topic}-${i}`}
                    task={task}
                    index={i}
                    isNext={i === nextIndex}
                    mastery={scoreByTopic.get(task.topic) ?? task.mastery_at_plan}
                    showWhy
                  />
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-line">{plan.data && <SourceLabel source={plan.data.source} />}</div>
            </>
          )}
        </Panel>

        <div className="flex flex-col gap-8">
          <Panel title={t('Time today')}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[1.75rem] leading-tight font-bold">{t('{n} min', { n: doneMinutes })}</span>
              <span className="text-print-dark font-medium">{t('of {n} planned', { n: totalMinutes })}</span>
            </div>
            <div
              className="h-2 rounded-full bg-tint overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('Time today')}
            >
              <div className="h-full bg-ink transition-[width] duration-200" style={{ width: `${pct}%` }} />
            </div>
          </Panel>

          <Panel title={t('Queued for tomorrow')}>
            {queue.error && !queue.data ? (
              <ErrorState error={queue.error} onRetry={queue.refetch} />
            ) : queue.isLoading ? (
              <Skeleton className="h-12" />
            ) : (queue.data ?? []).length === 0 ? (
              <p className="text-ink-soft">
                {t('Remedial tasks from quizzes and your documents wait here until tomorrow.')}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {(queue.data ?? []).map((item) => (
                  <li key={item.id} className="flex items-start gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{item.task.task}</p>
                      <p className="text-sm text-ink-soft">{t('{n} min', { n: item.task.minutes })}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQueued(item.id)}
                      aria-label={t('Remove from tomorrow')}
                      className="flex-none w-9 h-9 inline-flex items-center justify-center rounded-sheet text-print-dark hover:bg-tint"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('Finished for the day?')} tint>
            <p className="mb-2">{t('Submit proof to keep your streak')}</p>
            <Link to="/proof" className="font-semibold text-print-dark">
              {t('Go to Proof')}
            </Link>
          </Panel>
        </div>
      </div>

      <Dialog open={Boolean(activeTask)} onClose={closeSession} title={activeTask?.topic ?? ''} wide>
        {activeTask && activeIndex !== null && (
          <StudySession key={activeIndex} task={activeTask} index={activeIndex} onClose={closeSession} onDone={closeSession} />
        )}
      </Dialog>
    </div>
  );
}
