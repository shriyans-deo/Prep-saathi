import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { invalidate, useQuery } from '../lib/query';
import { fetchLatestReflection, fetchMastery, fetchStudyLogs, generateReflection } from '../lib/data';
import { MonthGrid } from '../components/MonthGrid';
import {
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
  masteryBand,
} from '../components/ui';

export default function ProgressPage() {
  const { user, profile } = useAuth();
  const { t } = usePrefs();
  const uid = user!.id;

  const mastery = useQuery(`mastery:${uid}`, () => fetchMastery(uid));
  const logs = useQuery(`logs:${uid}`, () => fetchStudyLogs(uid, 31));
  const reflection = useQuery(`reflection:${uid}`, () => fetchLatestReflection(uid));

  const [showAll, setShowAll] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const rows = useMemo(() => mastery.data ?? [], [mastery.data]);
  const weakest = rows.slice(0, 3);
  const visible = showAll ? rows : rows.slice(0, 12);
  const tested = rows.filter((m) => m.attempts > 0).length;

  const target = Number(profile?.daily_target_hrs ?? 6);
  const activeDays = (logs.data ?? []).filter((l) => l.actual_hrs > 0).length;

  const makeReflection = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      await generateReflection();
      invalidate('reflection:');
    } catch (e) {
      setGenError(aiErrorMessage(e, t));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('Progress')} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
        <div className="flex flex-col gap-8">
          <Panel>
            <h2 className="text-xl leading-snug font-bold mb-1">{t('Can you name your three weakest topics?')}</h2>
            {mastery.error && !mastery.data ? (
              <ErrorState error={mastery.error} onRetry={mastery.refetch} />
            ) : mastery.isLoading ? (
              <Skeleton className="h-24 mt-3" />
            ) : (
              <>
                <ol className="mt-3 flex flex-col gap-1.5">
                  {weakest.map((m, i) => (
                    <li key={m.topic_id} className="flex items-baseline gap-2.5">
                      <span className="font-bold text-print w-4 flex-none">{i + 1}</span>
                      <span className="min-w-0 flex-1 text-lg font-semibold leading-snug">{m.topics.topic_name}</span>
                      <span className="text-lg font-bold">{m.score}%</span>
                    </li>
                  ))}
                </ol>
                <p className="text-sm text-ink-soft mt-2">
                  {tested === 0
                    ? t('These are the starting scores from your setup. Quizzes replace them with measured ones.')
                    : t('{n} of {m} topics measured by quizzes so far.', { n: tested, m: rows.length })}
                </p>
              </>
            )}
          </Panel>

          <Panel
            title={t('All topics, weakest first')}
          >
            <p className="text-sm text-ink-soft mb-3">{t('The blue marks are printed at 40% and 70%. Below 40% is weak, above 70% is strong.')}</p>
            {mastery.error && !mastery.data ? (
              <ErrorState error={mastery.error} onRetry={mastery.refetch} />
            ) : mastery.isLoading ? (
              <Skeleton className="h-60" />
            ) : (
              <>
                <ul className="flex flex-col gap-2.5">
                  {visible.map((m) => {
                    const band = masteryBand(m.score);
                    return (
                      <li key={m.topic_id}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="min-w-0 font-medium">
                            {m.topics.topic_name}
                            <span className="text-ink-soft font-normal"> · {m.topics.subject}</span>
                          </span>
                          <span className="font-semibold whitespace-nowrap">
                            {m.score}%
                            <span className={cx('font-medium', band === 'weak' ? 'text-gap' : 'text-ink-soft')}>
                              {' · '}
                              {t(band === 'weak' ? 'Weak' : band === 'learning' ? 'Learning' : 'Strong')}
                            </span>
                          </span>
                        </div>
                        <div className="relative h-2 mt-1 rounded-full bg-tint" aria-hidden="true">
                          <div className="h-full rounded-full bg-ink" style={{ width: `${m.score}%` }} />
                          <span className="absolute -top-0.5 -bottom-0.5 left-[40%] w-0.5 bg-print" />
                          <span className="absolute -top-0.5 -bottom-0.5 left-[70%] w-0.5 bg-print" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {rows.length > 12 && (
                  <Button small variant="ghost" className="mt-3" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? t('Show fewer') : t('Show all {n} topics', { n: rows.length })}
                  </Button>
                )}
              </>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-8">
          <Panel
            title={t('This week')}
            aside={
              <Button small variant="print" loading={generating} onClick={makeReflection}>
                {!generating && <Sparkles size={14} aria-hidden="true" />}
                {reflection.data ? t('Refresh') : t('Generate')}
              </Button>
            }
          >
            {genError && <Notice tone="error" className="mb-3">{genError}</Notice>}
            {reflection.error && !reflection.data ? (
              <ErrorState error={reflection.error} onRetry={reflection.refetch} />
            ) : reflection.isLoading ? (
              <Skeleton className="h-32" />
            ) : !reflection.data ? (
              <p className="text-ink-soft">
                {t('Get a short reflection on your week: where the gap appears, what improved, and one thing to change.')}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-lg font-bold leading-snug">{reflection.data.headline}</p>
                <div>
                  <h3 className="text-sm font-medium text-print-dark">{t('Pattern')}</h3>
                  <p>{reflection.data.pattern}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-print-dark">{t('Win')}</h3>
                  <p>{reflection.data.win}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-print-dark">{t('Next week')}</h3>
                  <p>{reflection.data.next_week_focus}</p>
                </div>
                <SourceLabel source={reflection.data.source} />
              </div>
            )}
          </Panel>

          <Panel title={t('Last 30 days')} aside={<span className="font-medium">{t('{n} of 30 active', { n: activeDays })}</span>}>
            {logs.error && !logs.data ? (
              <ErrorState error={logs.error} onRetry={logs.refetch} />
            ) : logs.isLoading ? (
              <Skeleton className="h-44" />
            ) : activeDays === 0 ? (
              <EmptyState title={t('No marks yet')}>{t('Each day you study fills one bubble. Empty bubbles make the gaps obvious.')}</EmptyState>
            ) : (
              <MonthGrid logs={logs.data ?? []} target={target} joined={profile?.created_at ?? ''} />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
