import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { EXAMS, CITY_TIERS, MASTERY } from '../lib/constants';

const SUBJECT_OPTIONS: Record<string, string[]> = {
  'SSC CGL': [
    'Quantitative Aptitude - Arithmetic',
    'Quantitative Aptitude - Advanced (Geometry & Algebra)',
    'Logical & Analytical Reasoning',
    'English Comprehension & Vocabulary',
    'General Awareness - Modern History & Polity',
    'General Awareness - General Science & Static GK',
  ],
  'UPSC CSE': [
    'Indian Polity & Constitution',
    'Modern Indian History & Culture',
    'Geography & Environment',
    'Indian Economy & Budget',
    'General Science & Technology',
    'CSAT - Quantitative & Reasoning',
  ],
  'IBPS PO': [
    'Quantitative Aptitude & Data Interpretation',
    'Reasoning Ability & Puzzles',
    'English Language & Reading Comprehension',
    'Banking Awareness & Financial GK',
    'Computer Knowledge',
  ],
  'RRB NTPC': [
    'Mathematics & Numerical Ability',
    'General Intelligence & Reasoning',
    'General Science (Physics/Chemistry/Bio)',
    'General Awareness & Current Affairs',
  ],
};

const SQUAD_PREVIEWS: Record<
  string,
  { name: string; members: { name: string; streak: number; status: string }[] }
> = {
  'SSC CGL': {
    name: 'SSC CGL Mission 2026',
    members: [
      { name: 'Aspirant A (Rank Target < 500)', streak: 18, status: 'Checked in 2h ago' },
      { name: 'Aspirant B (Tier-2 Delhi)', streak: 14, status: 'Checked in 45m ago' },
      { name: 'Aspirant C (Repeat Attempt)', streak: 9, status: 'Checked in 4h ago' },
      { name: 'Aspirant D (Patna)', streak: 7, status: 'Pending today' },
      { name: 'Aspirant E (Self-study)', streak: 4, status: 'Pending today' },
    ],
  },
  'UPSC CSE': {
    name: 'UPSC CSE Focus Batch',
    members: [
      { name: 'Aspirant A (Optional: PSIR)', streak: 21, status: 'Checked in 1h ago' },
      { name: 'Aspirant B (Prelims 2026)', streak: 16, status: 'Checked in 3h ago' },
      { name: 'Aspirant C (Jaipur)', streak: 11, status: 'Checked in 5h ago' },
      { name: 'Aspirant D (CSAT Focus)', streak: 8, status: 'Pending today' },
      { name: 'Aspirant E (Working Professional)', streak: 5, status: 'Pending today' },
    ],
  },
  default: {
    name: 'National Aspirants Cohort #4',
    members: [
      { name: 'Aspirant A', streak: 15, status: 'Checked in 1h ago' },
      { name: 'Aspirant B', streak: 12, status: 'Checked in 3h ago' },
      { name: 'Aspirant C', streak: 8, status: 'Checked in 5h ago' },
      { name: 'Aspirant D', streak: 6, status: 'Pending today' },
      { name: 'Aspirant E', streak: 3, status: 'Pending today' },
    ],
  },
};

export default function OnboardingPage() {
  const { user, profile, updateProfileState, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 State (§6 Screen 2)
  const [exam, setExam] = useState<string>(profile?.exam || 'SSC CGL');
  const [attemptNumber, setAttemptNumber] = useState<number>(profile?.attempt_number || 1);
  const [cityTier, setCityTier] = useState<string>(profile?.city_tier || 'tier2');

  // Step 2 State (§6 Screen 2)
  const [dailyTargetHrs, setDailyTargetHrs] = useState<number>(profile?.daily_target_hrs || 6);
  const [weakSubjects, setWeakSubjects] = useState<string[]>([
    'Quantitative Aptitude - Advanced (Geometry & Algebra)',
    'Logical & Analytical Reasoning',
    'General Awareness - Modern History & Polity',
  ]);

  const availableSubjects = SUBJECT_OPTIONS[exam] || SUBJECT_OPTIONS['SSC CGL'];
  const squadPreview = SQUAD_PREVIEWS[exam] || SQUAD_PREVIEWS.default;

  const toggleSubject = (subj: string) => {
    if (weakSubjects.includes(subj)) {
      setWeakSubjects(weakSubjects.filter((s) => s !== subj));
    } else {
      if (weakSubjects.length >= 3) {
        // Keep maximum of 3 per spec
        setWeakSubjects([...weakSubjects.slice(1), subj]);
      } else {
        setWeakSubjects([...weakSubjects, subj]);
      }
    }
  };

  const handleFinishOnboarding = async () => {
    setSubmitting(true);
    try {
      if (user?.id) {
        // 1. Create or join squad
        let squadId = profile?.squad_id;
        try {
          const { data: existingSquad } = await supabase
            .from('squads')
            .select('id')
            .eq('name', squadPreview.name)
            .maybeSingle();

          if (existingSquad?.id) {
            squadId = existingSquad.id;
          } else {
            const { data: newSquad } = await supabase
              .from('squads')
              .insert({
                name: squadPreview.name,
                exam: exam,
                member_count: 6,
              })
              .select('id')
              .single();
            if (newSquad) squadId = newSquad.id;
          }
        } catch (e) {
          console.warn('Squad assignment fallback:', e);
        }

        // 2. Update user profile
        try {
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              name: profile?.name || 'Aspirant',
              exam,
              attempt_number: attemptNumber,
              city_tier: cityTier,
              daily_target_hrs: dailyTargetHrs,
              squad_id: squadId,
              streak_count: profile?.streak_count || 1,
              total_points: profile?.total_points || 50,
            });
        } catch (e) {
          console.warn('Profile update deferred:', e);
        }

        // 3. Seed mastery for topics based on selected weak subjects (§6 Screen 2)
        try {
          const { data: topics } = await supabase
            .from('topics')
            .select('id, topic_name, subject')
            .eq('exam', exam);

          if (topics && topics.length > 0) {
            const masteryInserts = topics.map((t) => {
              const isWeak = weakSubjects.some(
                (w) =>
                  w.toLowerCase().includes(t.subject.toLowerCase()) ||
                  w.toLowerCase().includes(t.topic_name.toLowerCase())
              );
              return {
                user_id: user.id,
                topic_id: t.id,
                score: isWeak ? MASTERY.WEAK_SEED : MASTERY.DEFAULT_SEED,
                status: isWeak ? 'weak' : 'learning',
                attempts: 1,
              };
            });

            await supabase
              .from('mastery')
              .upsert(masteryInserts, { onConflict: 'user_id,topic_id' });
          }
        } catch (e) {
          console.warn('Mastery seeding deferred:', e);
        }
      }

      // Update local profile state
      updateProfileState({
        exam,
        attempt_number: attemptNumber,
        city_tier: cityTier,
        daily_target_hrs: dailyTargetHrs,
      });

      await refreshProfile();
      navigate('/dashboard');
    } catch (err) {
      console.error('Onboarding submission error:', err);
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center p-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-grey/20 overflow-hidden">
        {/* Top Progress Bar (§6 Screen 2: Progress bar across the top. No skip button) */}
        <div className="bg-navy p-6 text-white">
          <div className="flex items-center justify-between text-xs text-sky mb-2">
            <span className="font-semibold uppercase tracking-wider">Aspirant Diagnostic Setup</span>
            <span className="font-mono">Step {step} of 3</span>
          </div>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-6 md:p-8">
          {/* STEP 1: Exam & Attempt */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-navy">Step 1: Your Target Exam & Background</h2>
                <p className="text-xs text-grey mt-1">
                  PrepSaathi configures your syllabus topics and peer squad based on your exam.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-2">
                  Select Exam
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {EXAMS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setExam(item)}
                      className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                        exam === item
                          ? 'border-blue bg-blue/10 text-blue ring-1 ring-blue font-semibold'
                          : 'border-grey/30 bg-white text-navy hover:border-grey'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-2">
                    Attempt Number
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAttemptNumber(num)}
                        className={`flex-1 py-2.5 rounded-lg border text-xs font-medium transition ${
                          attemptNumber === num
                            ? 'bg-navy text-white border-navy font-semibold'
                            : 'border-grey/30 bg-white text-navy hover:bg-slate-50'
                        }`}
                      >
                        {num === 1 ? '1st' : num === 2 ? '2nd' : num === 3 ? '3rd' : '4+'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-2">
                    City Location (Tier)
                  </label>
                  <select
                    value={cityTier}
                    onChange={(e) => setCityTier(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-lg border border-grey/30 bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-blue"
                  >
                    {CITY_TIERS.map((tier) => (
                      <option key={tier.value} value={tier.value}>
                        {tier.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-lg bg-blue hover:bg-blue/90 text-white font-medium text-xs transition"
                >
                  Continue to Daily Target →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Daily Target Hours & Hardest Subjects */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-navy">Step 2: Study Capacity & Diagnostic Baseline</h2>
                <p className="text-xs text-grey mt-1">
                  Pick your target hours and 3 hardest areas. This seeds your baseline mastery so your initial plan is non-generic.
                </p>
              </div>

              {/* Slider 2–12 (§6 Step 2) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-grey/20">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-navy uppercase tracking-wider">
                    Daily Planned Study Hours
                  </label>
                  <span className="text-lg font-bold text-blue">{dailyTargetHrs} hrs/day</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={0.5}
                  value={dailyTargetHrs}
                  onChange={(e) => setDailyTargetHrs(parseFloat(e.target.value))}
                  className="w-full accent-blue cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-grey mt-1">
                  <span>2 hours (Working)</span>
                  <span>6 hours (Standard Full-Time)</span>
                  <span>12 hours (Intensive)</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-navy uppercase tracking-wider">
                    Pick 3 Subjects You Find Hardest
                  </label>
                  <span
                    className={`text-xs font-medium ${
                      weakSubjects.length === 3 ? 'text-emerald-600' : 'text-orange'
                    }`}
                  >
                    {weakSubjects.length} of 3 selected
                  </span>
                </div>
                <p className="text-[11px] text-grey mb-3">
                  Weak topics are seeded at 30% mastery score to force remedial scheduling; others start at 60%.
                </p>

                <div className="space-y-2">
                  {availableSubjects.map((subj) => {
                    const isSelected = weakSubjects.includes(subj);
                    return (
                      <div
                        key={subj}
                        onClick={() => toggleSubject(subj)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? 'border-orange bg-orange/5 text-navy font-medium'
                            : 'border-grey/20 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{subj}</span>
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                            isSelected ? 'bg-orange text-white' : 'border border-grey/30'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg border border-grey/30 text-xs text-grey hover:text-navy"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={weakSubjects.length === 0}
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-lg bg-blue hover:bg-blue/90 text-white font-medium text-xs transition disabled:opacity-50"
                >
                  Continue to Squad Match →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Auto-join Squad matching exam (§6 Step 3) */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-navy">Step 3: Accountability Squad Match</h2>
                <p className="text-xs text-grey mt-1">
                  You are being matched into a 6-member squad of serious {exam} aspirants.
                </p>
              </div>

              {/* Squad Preview Card */}
              <div className="p-5 rounded-xl border border-blue/20 bg-blue/5">
                <div className="flex items-center justify-between pb-3 border-b border-blue/15 mb-3">
                  <div>
                    <h3 className="font-bold text-sm text-navy">{squadPreview.name}</h3>
                    <p className="text-[11px] text-grey">Exam: {exam} · 6 members</p>
                  </div>
                  <span className="text-[10px] bg-blue/20 text-blue px-2 py-0.5 rounded-full font-medium">
                    Auto-Matched
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-3">
                  You are joining 5 pseudonymous peers. Your daily check-in is visible to them to create healthy social commitment and loss aversion:
                </p>

                <div className="space-y-2">
                  {squadPreview.members.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-grey/15 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[10px] text-navy font-bold">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="font-medium text-navy">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-orange font-semibold">🔥 {m.streak}d</span>
                        <span className="text-[11px] text-grey">{m.status}</span>
                      </div>
                    </div>
                  ))}

                  {/* User entry */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue/10 border border-blue/30 text-xs font-semibold text-blue">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue text-white flex items-center justify-center font-mono text-[10px]">
                        YOU
                      </span>
                      <span>{profile?.name || 'You (New Member)'}</span>
                    </div>
                    <span className="text-[11px] text-blue">Starting Day 1</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-orange/10 border border-orange/20 text-xs text-orange-900">
                <strong>Loss aversion active:</strong> If you miss submitting today's study proof by 23:59, a red flag is displayed next to your entry in the squad board.
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg border border-grey/30 text-xs text-grey hover:text-navy"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinishOnboarding}
                  className="px-6 py-2.5 rounded-lg bg-blue hover:bg-blue/90 text-white font-medium text-xs transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Baseline Plan...</span>
                    </>
                  ) : (
                    <span>Complete Setup & Open Dashboard →</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
