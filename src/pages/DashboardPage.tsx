import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { useQuery, invalidate } from '../lib/query';
import {
  buildGapSeries,
  buildWeeklyTrend,
  fetchMastery,
  fetchOpenRetests,
  fetchRecentQuizzes,
  fetchSquadBoard,
  fetchStudyLogs,
  fetchTodayPlan,
  logHours,
} from '../lib/data';
import { formatDay, formatLongDate, istToday } from '../lib/dates';
import { round1, summarizeGap } from '../lib/stats';
import { GapChart, TrendChart } from '../components/Charts.lazy';
import { MonthGrid } from '../components/MonthGrid';
import { TaskRow, nextTaskIndex } from '../components/TaskRow';
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Notice,
  Panel,
  Rich,
  Segmented,
  Skeleton,
  SourceLabel,
  Stat,
  inputClass,
  useToast,
} from '../components/ui';

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const { t, lang, lite } = usePrefs();
  const navigate = useNavigate();
  const toast = useToast();
  const uid = user!.id;

  const [range, setRange] = useState<'7' | '30'>('7');
  const [logOpen, setLogOpen] = useState(false);
  const [hours, setHours] = useState('1');
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const plan = useQuery('plan:today', fetchTodayPlan);
  const logs = useQuery(`logs:${uid}`, () => fetchStudyLogs(uid, 31));
  const mastery = useQuery(`mastery:${uid}`, () => fetchMastery(uid));
  const board = useQuery('squad:board', fetchSquadBoard);
  const quizzes = useQuery(`quizzes:${uid}`, () => fetchRecentQuizzes(uid, 30));
  const retests = useQuery(`retests:${uid}`, () => fetchOpenRetests(uid));

  const target = Number(profile?.daily_target_hrs ?? 6);
  const joined = profile?.created_at ?? '';
  const series = useMemo(() => buildGapSeries(logs.data ?? [], Number(range) + 1, target, joined), [logs.data, range, target, joined]);
  const summary = summarizeGap(series);
  const hasActivity = (logs.data ?? []).some((l) => l.actual_hrs > 0);

  const tasks = plan.data?.tasks.tasks ?? [];
  const nextIndex = nextTaskIndex(tasks);
  const scoreByTopic = useMemo(
    () => new Map((mastery.data ?? []).map((m) => [m.topics.topic_name, m.score])),
    [mastery.data]
  );

  const trend = useMemo(() => buildWeeklyTrend(logs.data ?? [], quizzes.data ?? []), [logs.data, quizzes.data]);
  const dueRetests = (retests.data ?? []).filter((r) => r.due_date <= istToday());

  const checkedIn = (board.data ?? []).filter((m) => m.checked_in_today).length;
  const avgStreak = board.data?.length
    ? round1(board.data.reduce((sum, m) => sum + m.streak, 0) / board.data.length)
    : 0;

  const submitHours = async () => {
    const value = Number(hours);
    if (!Number.isFinite(value) || value <= 0 || value > 16) {
      setHoursError(t('Enter a number of hours between 0.25 and 16.'));
      return;
    }
    setHoursError(null);
    setSaving(true);
    try {
      await logHours(value);
      invalidate('logs:');
      setLogOpen(false);
      toast(t('{n} hours added to today.', { n: value }));
    } catch (e) {
      console.error('Could not log hours:', e);
      toast(t('Could not save. Check your connection and try again.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const gapTable = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-print-dark">
            <th className="font-medium py-1 pr-3">{t('Day')}</th>
            <th className="font-medium py-1 pr-3 text-right">{t('Planned')}</th>
            <th className="font-medium py-1 pr-3 text-right">{t('Done')}</th>
            <th className="font-medium py-1 text-right">{t('Gap')}</th>
          </tr>
        </thead>
        <tbody>
          {[...series].reverse().map((p) => (
            <tr key={p.log_date} className="border-t border-line">
              <td className="py-1 pr-3">
                {p.log_date === istToday() ? t('Today so far') : formatDay(p.log_date, lang)}
              </td>
              <td className="py-1 pr-3 text-right text-print-dark">{p.planned_hrs}h</td>
              <td className="py-1 pr-3 text-right font-semibold">{p.actual_hrs}h</td>
              <td className="py-1 text-right">{round1(p.gap_hrs)}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const trendTable = (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-print-dark">
          <th className="font-medium py-1">{t('Week of')}</th>
          <th className="font-medium py-1 text-right">{t('Quiz accuracy')}</th>
          <th className="font-medium py-1 text-right">{t('Consistency')}</th>
        </tr>
      </thead>
      <tbody>
        {trend.map((p) => (
          <tr key={p.label} className="border-t border-line">
            <td className="py-1">{formatDay(p.label, lang)}</td>
            <td className="py-1 text-right font-semibold">{p.accuracy === null ? '-' : `${p.accuracy}%`}</td>
            <td className="py-1 text-right">{p.consistency}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const monthPanel = (
    <Panel title={t('Last 30 days')}>
      {logs.error && !logs.data ? (
        <ErrorState error={logs.error} onRetry={logs.refetch} />
      ) : logs.isLoading ? (
        <Skeleton className="h-24" />
      ) : (
        <MonthGrid logs={logs.data ?? []} target={target} joined={joined} />
      )}
    </Panel>
  );

  return (
    <div className="flex flex-col gap-8">
      <header>
        {logs.isLoading ? (
          <Skeleton className="h-10 max-w-xl" />
        ) : hasActivity ? (
          <h1 className="text-[1.75rem] sm:text-[2.25rem] leading-tight font-bold max-w-[34ch] [text-wrap:balance]">
            <Rich
              template={t('In the last {days} days you planned {planned} hours and did {actual}.', { days: range })}
              parts={{
                planned: <span className="text-print">{summary.planned}</span>,
                actual: <span>{summary.actual}</span>,
              }}
            />{' '}
            <span className="text-print">{t('Gap {n}%.', { n: summary.gapPct })}</span>
          </h1>
        ) : (
          <h1 className="text-[1.75rem] sm:text-[2.25rem] leading-tight font-bold max-w-[34ch] [text-wrap:balance]">
            {t('Nothing is marked yet. Finish your first task and your gap starts measuring.')}
          </h1>
        )}
        <p className="text-ink-soft mt-1.5">
          {formatLongDate(istToday(), lang)} · {profile?.name}
        </p>
      </header>

      {dueRetests.length > 0 && (
        <Notice
          action={
            <Button small variant="print" onClick={() => navigate(`/quiz?topic=${encodeURIComponent(dueRetests[0].topic_name)}`)}>
              {t('Take it now')}
            </Button>
          }
        >
          {t('Retest due: {topic}', { topic: dueRetests.map((r) => r.topic_name).join(', ') })}
        </Notice>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start">
        {/* On phones the next action comes before the chart. */}
        <div className="flex flex-col gap-8 lg:order-2">
          <Panel
            title={t("Today's plan")}
            aside={
              tasks.length > 0 && (
                <span className="text-sm font-medium">
                  {t('{n} of {m} done', { n: tasks.filter((x) => x.completed).length, m: tasks.length })}
                </span>
              )
            }
          >
            {plan.error && !plan.data ? (
              <ErrorState error={plan.error} onRetry={plan.refetch} />
            ) : plan.isLoading ? (
              <div className="flex flex-col gap-3" role="status" aria-label={t('Building your plan...')}>
                <p className="text-ink-soft">{t('Building your plan from your scores...')}</p>
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
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
                    />
                  ))}
                </ul>
                {nextIndex === -1 && tasks.length > 0 && (
                  <Notice tone="good" className="mt-3">
                    {t('All marked for today. Submit your proof to keep your streak.')}
                  </Notice>
                )}
                <div className="mt-3 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
                  {plan.data && <SourceLabel source={plan.data.source} />}
                  <Link to="/plan" className="text-sm font-semibold text-print-dark inline-flex items-center gap-1">
                    {t('Open full plan')}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </>
            )}
          </Panel>

          <div className="hidden lg:block">{monthPanel}</div>
        </div>

        <div className="flex flex-col gap-8 lg:order-1 min-w-0">
          <Panel
            title={t('Execution gap')}
            aside={
              <Segmented
                label={t('Time range')}
                value={range}
                onChange={setRange}
                options={[
                  { value: '7', label: t('7 days') },
                  { value: '30', label: t('30 days') },
                ]}
              />
            }
          >
            {logs.error && !logs.data ? (
              <ErrorState error={logs.error} onRetry={logs.refetch} />
            ) : logs.isLoading ? (
              <Skeleton className="h-64 sm:h-72" />
            ) : !hasActivity ? (
              <EmptyState title={t('Your chart starts with your first mark')}>
                {t('Each study session you finish is plotted against what you planned. The shaded area is the gap.')}
              </EmptyState>
            ) : lite ? (
              gapTable
            ) : (
              <>
                <GapChart points={series} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ink-soft">
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="22" height="4" aria-hidden="true"><line x1="0" y1="2" x2="22" y2="2" stroke="#c4264a" strokeWidth="2" strokeDasharray="5 3" /></svg>
                    {t('Planned')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="22" height="4" aria-hidden="true"><line x1="0" y1="2" x2="22" y2="2" stroke="#14141a" strokeWidth="3" /></svg>
                    {t('Done')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-3 rounded-[2px] bg-print/15" aria-hidden="true" />
                    {t('Execution gap')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-ink" aria-hidden="true" />
                    {t('Today so far')}
                  </span>
                </div>
                <details className="mt-2 text-sm">
                  <summary className="font-medium text-print-dark">{t('Show as a table')}</summary>
                  <div className="mt-2">{gapTable}</div>
                </details>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-ink-soft">{t('Studied without starting a task?')}</span>
              <Button small variant="print" onClick={() => setLogOpen(true)}>
                <Clock size={14} aria-hidden="true" />
                {t('Log hours')}
              </Button>
            </div>
          </Panel>

          <div className="lg:hidden">{monthPanel}</div>

          <div className="grid gap-8 sm:grid-cols-2 items-start">
            <Panel
              title={t('Squad today')}
              aside={
                <Link to="/squad" className="text-sm font-semibold text-print-dark">
                  {t('Open squad')}
                </Link>
              }
            >
              {board.error && !board.data ? (
                <ErrorState error={board.error} onRetry={board.refetch} />
              ) : board.isLoading ? (
                <Skeleton className="h-16" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Stat label={t('Checked in')} value={t('{n} of {m}', { n: checkedIn, m: board.data?.length ?? 0 })} />
                  <Stat label={t('Average streak')} value={t('{n} days', { n: avgStreak })} />
                </div>
              )}
            </Panel>

            <Panel title={t('Accuracy and consistency')}>
              {(quizzes.error && !quizzes.data) || (logs.error && !logs.data) ? (
                <ErrorState error={quizzes.error ?? logs.error} onRetry={() => {
                  void quizzes.refetch();
                  void logs.refetch();
                }} />
              ) : quizzes.isLoading || logs.isLoading ? (
                <Skeleton className="h-52" />
              ) : (quizzes.data ?? []).length === 0 && !hasActivity ? (
                <p className="text-ink-soft">{t('Appears after your first quiz or study session.')}</p>
              ) : lite ? (
                trendTable
              ) : (
                <>
                  <TrendChart points={trend} />
                  <div className="flex flex-wrap gap-x-4 mt-2 text-sm text-ink-soft">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-ink" aria-hidden="true" />
                      {t('Quiz accuracy')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full border-2 border-ink" aria-hidden="true" />
                      {t('Consistency')}
                    </span>
                  </div>
                  <details className="mt-2 text-sm">
                    <summary className="font-medium text-print-dark">{t('Show as a table')}</summary>
                    <div className="mt-2">{trendTable}</div>
                  </details>
                </>
              )}
            </Panel>
          </div>
        </div>
      </div>

      <Dialog open={logOpen} onClose={() => setLogOpen(false)} title={t('Log study hours')}>
        <p className="text-ink-soft mb-3">
          {t('For time you studied without starting a task here. This is added to today.')}
        </p>
        <Field label={t('Hours studied')} error={hoursError}>
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            step="0.25"
            min="0.25"
            max="16"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setLogOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button loading={saving} onClick={submitHours}>
            {t('Add hours')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
