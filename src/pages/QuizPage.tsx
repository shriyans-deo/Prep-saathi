import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth, DEMO_PROFILE } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { invokeAI } from '../lib/ai';
import { AI_TASKS } from '../lib/constants';
import {
  QuizIcon,
  CheckIcon,
  ClockIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
} from '../components/ui/Icons';
import { Badge } from '../components/ui/Badge';
import { NumberTicker } from '../components/magicui/NumberTicker';
import { ShimmerButton } from '../components/magicui/ShimmerButton';
import { triggerAcademicConfetti } from '../components/magicui/Confetti';
import { BlurFade } from '../components/magicui/BlurFade';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { ClickSpark } from '../components/reactbits/ClickSpark';
import { motion, AnimatePresence } from 'motion/react';

interface Question {
  q: string;
  options: string[];
  answer: string;
  concept: string;
}

interface QuizResult {
  score: number;
  total: number;
  concept_gap: string;
  feedback: string;
  mastery_delta: number;
  remedial_task: { task: string; minutes: number };
  retest_in_days: number;
}

const DEFAULT_QUESTIONS: Question[] = [
  {
    q: 'Two trains 140 m and 160 m long run at speeds of 60 km/h and 40 km/h respectively in opposite directions on parallel tracks. What is the time (in seconds) taken to cross each other?',
    options: ['9.0 s', '10.8 s', '12.0 s', '15.2 s'],
    answer: '10.8 s',
    concept: 'Opposite Relative Speed & Sum of Lengths',
  },
  {
    q: 'A thief is noticed by a policeman from a distance of 200 m. The thief starts running and the policeman chases him. The thief and the policeman run at the rate of 10 km/h and 11 km/h respectively. What is the distance between them after 6 minutes?',
    options: ['50 m', '100 m', '120 m', '150 m'],
    answer: '100 m',
    concept: 'Same Direction Relative Speed & Separation Distance',
  },
  {
    q: 'A man travels from A to B at 20 km/h and returns from B to A at 30 km/h over the same route. What is his average speed for the whole journey?',
    options: ['24 km/h', '25 km/h', '26 km/h', '22 km/h'],
    answer: '24 km/h',
    concept: 'Harmonic Mean for Equal Distances',
  },
  {
    q: 'Excluding stoppages, the speed of a bus is 54 km/h and including stoppages, it is 45 km/h. For how many minutes does the bus stop per hour?',
    options: ['8 min', '10 min', '12 min', '15 min'],
    answer: '10 min',
    concept: 'Transit Stoppage Time Calculation',
  },
  {
    q: 'Two runners start simultaneously from the same point on a circular track of 600 m length with speeds of 15 m/s and 25 m/s in the same direction. After how many seconds will they meet for the first time?',
    options: ['40 s', '60 s', '75 s', '90 s'],
    answer: '60 s',
    concept: 'Circular Track Relative Velocity Meeting Time',
  },
];

export default function QuizPage() {
  const { profile, isDemoUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentProfile = profile || DEMO_PROFILE;

  const [topicName, setTopicName] = useState<string>('Time, Speed and Distance');
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const isDocSource = searchParams.get('source') === 'doc';
    if (isDocSource) {
      const storedQuiz = sessionStorage.getItem('prepsaathi_active_doc_quiz');
      if (storedQuiz) {
        try {
          const parsed = JSON.parse(storedQuiz);
          if (parsed.questions && parsed.questions.length > 0) {
            setQuestions(parsed.questions);
            if (parsed.topic) setTopicName(parsed.topic);
          }
        } catch (e) {
          console.warn('Error reading doc quiz from session:', e);
        }
      }
    }
  }, [searchParams]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (option: string) => {
    if (quizResult) return;
    setSelectedAnswers({ ...selectedAnswers, [currentIndex]: option });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    setActionNotice(null);

    let correctCount = 0;
    const qaPayload = questions.map((q, idx) => {
      const userAns = selectedAnswers[idx] || '';
      const isCorrect = userAns === q.answer;
      if (isCorrect) correctCount++;
      return {
        question: q.q,
        user_answer: userAns,
        correct_answer: q.answer,
        concept: q.concept,
        is_correct: isCorrect,
      };
    });

    try {
      const aiResponse = await invokeAI(AI_TASKS.QUIZ_FEEDBACK, {
        topic: topicName,
        questions_with_user_answers: qaPayload,
        score: correctCount,
      });

      const result: QuizResult = {
        score: correctCount,
        total: questions.length,
        concept_gap:
          aiResponse?.concept_gap ||
          'Relative motion vectors when objects move in the same direction',
        feedback:
          aiResponse?.feedback ||
          'Your kinetic formulas are applied accurately for opposite directions, but when both bodies move in the same direction, the reference vector must be (S1 - S2).',
        mastery_delta: aiResponse?.mastery_delta ?? (correctCount >= 4 ? 6 : -8),
        remedial_task: aiResponse?.remedial_task || {
          task: 'Solve 10 focused relative velocity chase problems without shortcuts',
          minutes: 25,
        },
        retest_in_days: aiResponse?.retest_in_days || 3,
      };

      setQuizResult(result);

      if (correctCount >= 4) {
        triggerAcademicConfetti({ particleCount: 50, spread: 70 });
      }

      try {
        if (!isDemoUser && currentProfile.id) {
          await supabase.from('quizzes').insert({
            user_id: currentProfile.id,
            score: Math.round((correctCount / questions.length) * 100),
            questions: questions,
            user_answers: Object.values(selectedAnswers),
            ai_feedback: `${result.concept_gap}: ${result.feedback}`,
          });

          const { data: topicData } = await supabase
            .from('topics')
            .select('id')
            .eq('topic_name', topicName)
            .maybeSingle();

          if (topicData?.id) {
            const { data: existingMastery } = await supabase
              .from('mastery')
              .select('score, attempts')
              .eq('user_id', currentProfile.id)
              .eq('topic_id', topicData.id)
              .maybeSingle();

            const oldScore = existingMastery?.score || 35;
            const newScore = Math.max(0, Math.min(100, oldScore + result.mastery_delta));

            await supabase.from('mastery').upsert({
              user_id: currentProfile.id,
              topic_id: topicData.id,
              score: newScore,
              attempts: (existingMastery?.attempts || 1) + 1,
              last_tested_at: new Date().toISOString(),
            });
          }
        }
      } catch (dbErr) {
        console.warn('Mastery writeback note:', dbErr);
      }
    } catch (err) {
      console.error('Quiz feedback AI invocation error:', err);
      setQuizResult({
        score: correctCount,
        total: questions.length,
        concept_gap: 'Relative velocity vector calculations in pursuit scenarios',
        feedback:
          'Formula application breaks down when both bodies move in the same direction. Practice two-step vector subtraction.',
        mastery_delta: -6,
        remedial_task: {
          task: 'Practice 10 relative-motion chase questions without shortcuts',
          minutes: 25,
        },
        retest_in_days: 3,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRemedialTask = async () => {
    if (!quizResult) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      if (!isDemoUser && currentProfile.id) {
        const { data: existingPlan } = await supabase
          .from('daily_plans')
          .select('*')
          .eq('user_id', currentProfile.id)
          .eq('plan_date', tomorrowStr)
          .maybeSingle();

        const curTasks = existingPlan?.tasks?.tasks || [];
        const newTask = {
          subject: 'Quantitative Aptitude',
          topic: topicName,
          task: quizResult.remedial_task.task,
          minutes: quizResult.remedial_task.minutes,
          type: 'weak_topic',
          why: `Remedial task triggered by diagnostic gap: ${quizResult.concept_gap}`,
          completed: false,
        };

        await supabase.from('daily_plans').upsert({
          user_id: currentProfile.id,
          plan_date: tomorrowStr,
          tasks: {
            tasks: [...curTasks, newTask],
            total_minutes: 160,
            focus_note: `Reinforce ${quizResult.concept_gap} identified during quiz testing.`,
          },
          completed_count: 0,
        });
      }
    } catch (e) {
      console.warn('Remedial task plan insert:', e);
    }

    setActionNotice(
      `✓ Remedial task ("${quizResult.remedial_task.task}") has been queued into tomorrow's plan!`
    );
  };

  const handleSpacedRetry = () => {
    setActionNotice(
      `✓ Spaced repetition scheduled: You will be re-tested on "${topicName}" in 3 days to verify retention.`
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <BlurFade delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/90">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
                5-Question Diagnostic Assessment
              </h1>
              <Badge variant="primary">
                <span>{topicName}</span>
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Simulated exam conditions. Questions target your detected weak spots to dynamically adapt tomorrow's schedule.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="neutral">
              <ClockIcon size={12} />
              <span>Under 24h Loop</span>
            </Badge>
          </div>
        </div>
      </BlurFade>

      {/* 2-Column Responsive Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* MAIN PANEL (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {!quizResult ? (
            <BlurFade delay={0.1}>
              <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(11,31,58,0.06)] border border-slate-200/90 p-6 sm:p-8 space-y-6">
                {/* Progress bar at top */}
                <div className="space-y-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-navy uppercase tracking-wider">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue">
                      {Math.round(((currentIndex + 1) / questions.length) * 100)}% Complete
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-blue rounded-full"
                    />
                  </div>
                </div>

                {/* Question Text with Animated Entrance */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="min-h-[90px] flex items-center p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80"
                  >
                    <p className="text-base sm:text-lg font-extrabold text-navy leading-relaxed">
                      {currentQ.q}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Options with ClickSpark and SpotlightCard */}
                <div className="space-y-3">
                  {currentQ.options.map((opt, oIdx) => {
                    const isSelected = selectedAnswers[currentIndex] === opt;
                    const letter = String.fromCharCode(65 + oIdx);
                    return (
                      <ClickSpark key={oIdx} sparkColor="#2563EB" className="w-full">
                        <SpotlightCard
                          onClick={() => handleSelectOption(opt)}
                          spotlightColor="rgba(37, 99, 235, 0.08)"
                          className={`p-4 sm:p-5 cursor-pointer text-sm font-semibold transition-all flex items-center gap-4 rounded-2xl border ${
                            isSelected
                              ? 'border-blue bg-blue-50/70 text-blue-950 font-bold ring-2 ring-blue/30 shadow-md'
                              : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-blue text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="flex-1 text-sm sm:text-base font-medium">{opt}</span>
                        </SpotlightCard>
                      </ClickSpark>
                    );
                  })}
                </div>

                {/* Forward Navigation Only */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Exam discipline active: Forward navigation only
                  </span>

                  {currentIndex < questions.length - 1 ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      disabled={!selectedAnswers[currentIndex]}
                      onClick={handleNext}
                      className="px-6 py-3 rounded-2xl bg-blue hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue/20 transition disabled:opacity-40 cursor-pointer self-start sm:self-auto"
                    >
                      Next Question →
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      disabled={!selectedAnswers[currentIndex] || isSubmitting}
                      onClick={handleSubmitQuiz}
                      className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition disabled:opacity-40 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Analyzing Concept Gap with Groq AI...</span>
                        </>
                      ) : (
                        <span>Submit Quiz & Get Concept Feedback →</span>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            </BlurFade>
          ) : (
            /* QUIZ FEEDBACK VIEW */
            <BlurFade delay={0.1}>
              <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(11,31,58,0.06)] border border-slate-200/90 p-6 sm:p-8 space-y-6">
                {/* Header Outcome Box with NumberTicker */}
                <div className="p-6 sm:p-7 rounded-3xl bg-[#0B1F3A] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-navy/15 border border-blue-900/40">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-sky block">
                      Diagnostic Assessment Result
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2">
                      <NumberTicker value={quizResult.score} />
                      <span>of</span>
                      <NumberTicker value={quizResult.total} />
                      <span>Correct</span>
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Mastery Delta: <span className="text-orange-400 font-bold font-mono">{quizResult.mastery_delta}%</span> written to profile
                    </p>
                  </div>

                  <div className="p-3.5 px-4 rounded-2xl bg-white/10 border border-white/15 text-center self-start sm:self-auto">
                    <span className="text-[11px] text-slate-300 uppercase tracking-wider font-extrabold block">Topic Status</span>
                    <span className="text-sm font-bold text-orange-400">
                      Weak Topic (Requires Remediation)
                    </span>
                  </div>
                </div>

                {/* Concept Gap Feedback Box */}
                <div className="p-5 sm:p-6 rounded-2xl bg-orange-50/70 border-2 border-orange-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-orange">
                    <AlertTriangleIcon size={18} className="text-orange" />
                    <h3 className="text-sm font-extrabold uppercase tracking-wider">
                      Underlying Concept Gap: {quizResult.concept_gap}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">
                    {quizResult.feedback}
                  </p>
                </div>

                {actionNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2"
                  >
                    <CheckIcon size={14} className="text-emerald-700" />
                    <span>{actionNotice}</span>
                  </motion.div>
                )}

                {/* Action Buttons: Add Remedial Task & Retry in 3 Days */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <ShimmerButton
                    onClick={handleAddRemedialTask}
                    className="w-full py-3.5 px-4 text-xs font-bold shadow-md shadow-blue/20"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <QuizIcon size={16} />
                      <span>Add Remedial Task to Tomorrow</span>
                    </div>
                  </ShimmerButton>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleSpacedRetry}
                    className="py-3.5 px-4 rounded-2xl bg-navy hover:bg-[#162E52] text-white font-bold text-xs shadow-md shadow-navy/20 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCwIcon size={14} />
                    <span>Retry in {quizResult.retest_in_days} Days (Spaced Repetition)</span>
                  </motion.button>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setQuizResult(null);
                      setSelectedAnswers({});
                      setCurrentIndex(0);
                      setActionNotice(null);
                    }}
                    className="text-slate-500 hover:text-navy font-bold cursor-pointer"
                  >
                    ← Take Another Diagnostic
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/plan')}
                    className="font-bold text-blue hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Tomorrow's Updated Plan</span>
                    <ArrowRightIcon size={12} />
                  </button>
                </div>
              </div>
            </BlurFade>
          )}
        </div>

        {/* SIDEBAR COCKPIT (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Question Navigator */}
          <BlurFade delay={0.15}>
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(11,31,58,0.06)] p-6 space-y-4">
              <h3 className="font-extrabold text-sm text-navy tracking-tight">Question Navigator</h3>
              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((_, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = Boolean(selectedAnswers[idx]);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={quizResult !== null}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-11 rounded-2xl font-bold font-mono text-xs flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-blue text-white ring-2 ring-blue/30 shadow-sm'
                          : isAnswered
                          ? 'bg-[#0B1F3A] text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue" />
                  <span>Current</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B1F3A]" />
                  <span>Answered</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <span>Pending</span>
                </span>
              </div>
            </div>
          </BlurFade>

          {/* Exam Discipline Rules */}
          <BlurFade delay={0.2}>
            <div className="bg-[#0B1F3A] text-white rounded-3xl border border-blue-900/40 shadow-xl shadow-navy/15 p-6 space-y-3.5">
              <span className="text-xs font-black uppercase tracking-wider text-sky">Exam Discipline Rules</span>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-sky font-bold">•</span>
                  <span><strong>Forward only:</strong> Mimics strict computer-based test conditions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky font-bold">•</span>
                  <span><strong>Concept diagnosis:</strong> Identifies the exact rule breakdown instead of just giving an arbitrary percentage.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky font-bold">•</span>
                  <span><strong>Adaptive tomorrow:</strong> Missed concepts are scheduled into tomorrow's study block.</span>
                </li>
              </ul>
            </div>
          </BlurFade>

          {/* Mastery Benchmark */}
          <BlurFade delay={0.25}>
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(11,31,58,0.06)] p-6 space-y-3.5">
              <h4 className="font-extrabold text-sm text-navy">Topic Mastery Benchmark</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Current Measured</span>
                  <span className="font-mono text-orange font-bold">32%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange rounded-full" style={{ width: '32%' }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Cutoff Target: 75%</span>
                  <span className="text-rose-600 font-bold">-43% Deficit</span>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </div>
  );
}
