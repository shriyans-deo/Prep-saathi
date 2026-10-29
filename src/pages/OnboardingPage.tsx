import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { EXAMS, CITY_TIERS, MASTERY } from '../lib/constants';
import { CheckIcon, FlameIcon, ArrowRightIcon, FlagIcon } from '../components/ui/Icons';
import { Badge } from '../components/ui/Badge';

const SUBJECT_OPTIONS: Record<string, string[]> = {
  'SSC CGL': [
    'Quantitative Aptitude - Arithmetic & Percentages',
    'Quantitative Aptitude - Advanced (Geometry & Algebra)',
    'Logical & Analytical Reasoning',
    'English Comprehension & Vocabulary',
    'General Awareness - Modern History & Polity',
    'General Awareness - General Science & Static GK',
  ],
  'UPSC CSE': [
    'Indian Polity & Constitution',
    'Modern Indian History & Freedom Struggle',
    'Physical & Indian Geography',
    'Indian Economy & Union Budget',
    'Environment & Biodiversity',
    'CSAT - Quantitative & Reasoning',
  ],
  'IBPS PO': [
    'Quantitative Aptitude & Data Interpretation',
    'Reasoning Ability & Analytical Puzzles',
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
          console.warn('Profile update note:', e);
        }

        // 3. Seed mastery for topics based on selected weak subjects (§6 Screen 2)
        try {
          const { data: topics } = await supabase
            .from('topics')
            .select('id, topic_name, subject')
            .eq('exam', exam);

          if (topics && topics.length > 0) {
            const masteryInserts = topics.map((t: any) => {
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
          console.warn('Mastery seeding note:', e);
        }
      }

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
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center p-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Top Progress Header (§6 Screen 2: Progress bar across top. No skip button) */}
        <div className="bg-navy p-6 sm:p-7 text-white">
          <div className="flex items-center justify-between text-xs text-sky mb-2.5">
            <span className="font-bold uppercase tracking-wider">Aspirant Diagnostic Baseline</span>
            <span className="font-mono font-semibold">Step {step} of 3</span>
          </div>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-6 sm:p-8 md:p-10">
          {/* STEP 1: Exam & Attempt */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight">
                  Step 1: Target Exam & Background
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  PrepSaathi configures your syllabus topics and peer squad based on your exam.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-2.5">
                  Select Exam
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {EXAMS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setExam(item)}
                      className={`p-3.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                        exam === item
                          ? 'border-blue bg-blue/10 text-blue ring-1 ring-blue'
                          : 'border-slate-200 bg-white text-navy hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          attemptNumber === num
                            ? 'bg-navy text-white border-navy'
                            : 'border-slate-200 bg-white text-navy hover:bg-slate-50'
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
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-blue"
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
                  className="px-6 py-2.5 rounded-xl bg-blue hover:bg-blue/90 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Continue to Daily Target</span>
                  <ArrowRightIcon size={12} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Daily Target Hours & Hardest Subjects */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight">
                  Step 2: Study Capacity & Diagnostic Baseline
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pick your target hours and 3 hardest areas. This seeds your baseline mastery so your initial plan is non-generic.
                </p>
              </div>

              {/* Slider 2–12 (§6 Step 2) */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-navy uppercase tracking-wider">
                    Daily Planned Study Hours
                  </span>
                  <span className="text-xl font-extrabold text-blue font-mono">{dailyTargetHrs} hrs/day</span>
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
                <div className="flex justify-between text-[11px] text-slate-400 font-medium pt-1">
                  <span>2 hours (Working Aspirant)</span>
                  <span>6 hours (Standard Full-Time)</span>
                  <span>12 hours (Intensive)</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-navy uppercase tracking-wider">
                    Pick 3 Subjects You Find Hardest
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      weakSubjects.length === 3 ? 'text-emerald-700' : 'text-orange'
                    }`}
                  >
                    {weakSubjects.length} of 3 selected
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Weak topics are seeded at 30% mastery score to force remedial scheduling; others start at 60%.
                </p>

                <div className="space-y-2">
                  {availableSubjects.map((subj) => {
                    const isSelected = weakSubjects.includes(subj);
                    return (
                      <div
                        key={subj}
                        onClick={() => toggleSubject(subj)}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-orange bg-orange/5 text-navy font-bold'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{subj}</span>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                            isSelected ? 'bg-orange text-white' : 'border border-slate-300'
                          }`}
                        >
                          {isSelected && <CheckIcon size={11} />}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-600 hover:text-navy font-medium cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={weakSubjects.length === 0}
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-blue hover:bg-blue/90 text-white font-bold text-xs shadow-xs transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Continue to Squad Match</span>
                  <ArrowRightIcon size={12} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Auto-join Squad matching exam */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight">
                  Step 3: Accountability Squad Match
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  You are being matched into a 6-member cohort of serious {exam} aspirants.
                </p>
              </div>

              {/* Squad Preview Card */}
              <div className="p-5 rounded-2xl border border-blue/20 bg-blue/5 space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-blue/15">
                  <div>
                    <h3 className="font-bold text-sm text-navy">{squadPreview.name}</h3>
                    <p className="text-[11px] text-slate-500">Exam: {exam} · 6 members</p>
                  </div>
                  <Badge variant="primary">Auto-Matched</Badge>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Your daily check-in is visible to 5 peers to create healthy social commitment and loss aversion:
                </p>

                <div className="space-y-2">
                  {squadPreview.members.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-mono text-[10px] text-navy font-bold">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="font-semibold text-navy">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-orange font-bold flex items-center gap-1">
                          <FlameIcon size={11} className="text-orange" />
                          <span>{m.streak}d</span>
                        </span>
                        <span className="text-[11px] text-slate-400">{m.status}</span>
                      </div>
                    </div>
                  ))}

                  {/* User entry */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue/10 border border-blue/30 text-xs font-bold text-blue">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-blue text-white flex items-center justify-center font-mono text-[10px]">
                        YOU
                      </span>
                      <span>{profile?.name || 'You (New Member)'}</span>
                    </div>
                    <span className="text-[11px] text-blue">Starting Day 1</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-orange/10 border border-orange/20 text-xs text-orange-950 flex items-center gap-2.5">
                <FlagIcon size={16} className="text-orange flex-shrink-0" />
                <span className="leading-relaxed">
                  <strong>Loss aversion active:</strong> If you miss submitting today's study proof by 23:59, a red flag is displayed next to your entry in the squad board.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-600 hover:text-navy font-medium cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinishOnboarding}
                  className="px-6 py-2.5 rounded-xl bg-blue hover:bg-blue/90 text-white font-bold text-xs shadow-xs transition disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Baseline Plan...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup & Open Dashboard</span>
                      <ArrowRightIcon size={12} />
                    </>
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
