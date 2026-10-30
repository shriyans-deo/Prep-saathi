import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { completeOnboarding, fetchExamSubjects, fetchSquadBoard } from '../lib/data';
import { useQuery } from '../lib/query';
import { Bubble, Button, ErrorState, Notice, Segmented, Skeleton, cx, inputClass } from '../components/ui';

const EXAMS = ['SSC CGL', 'SSC CHSL', 'IBPS PO', 'IBPS Clerk', 'UPSC CSE', 'UPSC CAPF', 'RRB NTPC'];

const CITY_TIERS = [
  { value: 'metro', label: 'Metro city' },
  { value: 'tier2', label: 'Tier 2 city' },
  { value: 'small_town', label: 'Small town or rural' },
];

const ATTEMPTS = [
  { value: '1', label: '1st' },
  { value: '2', label: '2nd' },
  { value: '3', label: '3rd' },
  { value: '4', label: '4+' },
];

export default function OnboardingPage() {
  const { profile, refreshProfile } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [exam, setExam] = useState('');
  const [attempt, setAttempt] = useState('1');
  const [cityTier, setCityTier] = useState('tier2');
  const [target, setTarget] = useState(6);
  const [weak, setWeak] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const subjects = useQuery(exam ? `subjects:${exam}` : null, () => fetchExamSubjects(exam));
  const board = useQuery(step === 3 ? 'onboarding-squad' : null, fetchSquadBoard);

  const others = useMemo(() => (board.data ?? []).filter((m) => !m.is_me), [board.data]);

  // Already onboarded and arriving here fresh: nothing to do. Step 3 is reached before the
  // profile refreshes, so this only fires on a real revisit.
  if (profile?.exam && step === 1) return <Navigate to="/dashboard" replace />;

  const toggleWeak = (subject: string) => {
    setWeak((current) =>
      current.includes(subject)
        ? current.filter((s) => s !== subject)
        : current.length < 3
          ? [...current, subject]
          : current
    );
  };

  const finishSetup = async () => {
    setSaving(true);
    setSaveFailed(false);
    try {
      await completeOnboarding({
        exam,
        attempt: Number(attempt),
        cityTier,
        dailyTarget: target,
        weakSubjects: weak,
      });
      setStep(3);
    } catch (e) {
      console.error('Onboarding failed:', e);
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const openDashboard = async () => {
    await refreshProfile();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-print text-white px-5 py-3 flex items-center justify-between gap-4">
        <span className="text-xl font-bold">PrepSaathi</span>
        <span className="text-sm font-medium ml-auto">{t('Step {n} of 3', { n: step })}</span>
        <ol className="flex items-center gap-2" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <li key={n}>
              <span
                className={cx('block w-5 h-5 rounded-full border-[1.5px]', n <= step ? 'bg-ink border-ink' : 'border-white')}
                aria-hidden="true"
              />
            </li>
          ))}
        </ol>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-5 py-7">
        {step === 1 && (
          <>
            <h1 className="text-[1.75rem] leading-tight font-bold mb-5">{t('Which exam are you preparing for?')}</h1>

            <fieldset className="mb-6">
              <legend className="sr-only">{t('Exam')}</legend>
              <div className="grid grid-cols-2 gap-2">
                {EXAMS.map((name) => (
                  <label
                    key={name}
                    className={cx(
                      'flex items-center gap-2.5 min-h-12 px-3 rounded-sheet border font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                      exam === name ? 'border-ink' : 'border-line hover:border-print'
                    )}
                  >
                    <input type="radio" name="exam" className="sr-only" checked={exam === name} onChange={() => setExam(name)} />
                    <Bubble filled={exam === name} size={20} />
                    {name}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mb-5">
              <div className="font-medium mb-1.5">{t('Which attempt is this?')}</div>
              <Segmented label={t('Which attempt is this?')} value={attempt} onChange={setAttempt} options={ATTEMPTS} />
            </div>

            <label className="block mb-7">
              <span className="block font-medium mb-1.5">{t('Where do you live?')}</span>
              <select className={inputClass} value={cityTier} onChange={(e) => setCityTier(e.target.value)}>
                {CITY_TIERS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {t(c.label)}
                  </option>
                ))}
              </select>
            </label>

            <Button className="w-full sm:w-auto" disabled={!exam} onClick={() => setStep(2)}>
              {t('Continue')}
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-[1.75rem] leading-tight font-bold mb-5">{t('Set your daily target')}</h1>

            <label className="block mb-7">
              <span className="flex items-baseline justify-between mb-1.5">
                <span className="font-medium">{t('Hours you plan to study each day')}</span>
                <span className="text-[1.75rem] leading-none font-bold">{t('{n}h', { n: target })}</span>
              </span>
              <input
                type="range"
                className="w-full h-8"
                min={2}
                max={12}
                step={0.5}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </label>

            <fieldset className="mb-6">
              <legend className="font-medium mb-1">{t('Pick up to 3 subjects you find hardest')}</legend>
              <p className="text-sm text-ink-soft mb-3">
                {t('These start at 30% and everything else at 60%. Your quiz results replace these starting scores.')}
              </p>

              {subjects.error ? (
                <ErrorState error={subjects.error} onRetry={subjects.refetch} />
              ) : subjects.isLoading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {(subjects.data ?? []).map((subject) => {
                    const selected = weak.includes(subject);
                    const blocked = !selected && weak.length >= 3;
                    return (
                      <label
                        key={subject}
                        className={cx(
                          'flex items-center gap-2.5 min-h-12 px-3 rounded-sheet border font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                          selected ? 'border-ink' : 'border-line',
                          blocked ? 'opacity-50' : 'hover:border-print'
                        )}
                      >
                        <input type="checkbox" className="sr-only" checked={selected} disabled={blocked} onChange={() => toggleWeak(subject)} />
                        <Bubble filled={selected} size={20} />
                        {subject}
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>

            {saveFailed && <Notice tone="error" className="mb-4">{t('Could not save your setup. Check your connection and try again.')}</Notice>}

            <div className="flex gap-2">
              <Button variant="print" onClick={() => setStep(1)}>
                <ArrowLeft size={18} aria-hidden="true" />
                {t('Back')}
              </Button>
              <Button disabled={weak.length === 0} loading={saving} onClick={finishSetup}>
                {t('Continue')}
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-[1.75rem] leading-tight font-bold mb-2">{t('You have joined a squad')}</h1>
            <p className="text-ink-soft mb-5">
              {t('Up to six {exam} aspirants, shown only as letters. They see whether you checked in and how many hours you logged, never your name or your notes.', { exam })}
            </p>

            {board.error ? (
              <ErrorState error={board.error} onRetry={board.refetch} />
            ) : board.isLoading ? (
              <Skeleton className="h-28" />
            ) : (
              <ul className="border border-line rounded-sheet divide-y divide-line mb-5">
                {(board.data ?? []).map((m) => (
                  <li key={m.seat} className="flex items-center gap-3 px-3 min-h-12">
                    <Bubble size={26} label={m.seat} filled={m.is_me} />
                    <span className="font-medium">{m.is_me ? t('You') : t('Aspirant {seat}', { seat: m.seat })}</span>
                    <span className="ml-auto text-sm text-ink-soft">{t('{n} day streak', { n: m.streak })}</span>
                  </li>
                ))}
              </ul>
            )}

            {!board.isLoading && others.length === 0 && (
              <Notice className="mb-5">
                {t('You are the first here. New {exam} aspirants join this squad until it has six members.', { exam })}
              </Notice>
            )}

            <Button className="w-full sm:w-auto" onClick={openDashboard}>
              {t('Open my dashboard')}
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
