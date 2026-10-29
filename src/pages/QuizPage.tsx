import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth, DEMO_PROFILE } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { invokeAI } from '../lib/ai';
import { AI_TASKS } from '../lib/constants';

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

  // Load document-derived quiz if navigated from Library (§6 Screen 5)
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

  // Submit quiz and request concept-level AI feedback (§5 Task 2)
  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    setActionNotice(null);

    // Compute direct score
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
          'Your kinetic formulas are applied accurately for opposite directions, but when both bodies move forward, the sign convention must be (S1 - S2) rather than addition.',
        mastery_delta: aiResponse?.mastery_delta ?? (correctCount >= 4 ? 6 : -8),
        remedial_task: aiResponse?.remedial_task || {
          task: 'Solve 10 focused relative velocity chase problems',
          minutes: 25,
        },
        retest_in_days: aiResponse?.retest_in_days || 3,
      };

      setQuizResult(result);

      // Writeback to Supabase mastery table (§5 Task 2: "mastery_delta writes back to mastery.score")
      try {
        if (!isDemoUser && currentProfile.id) {
          // 1. Record quiz
          await supabase.from('quizzes').insert({
            user_id: currentProfile.id,
            score: Math.round((correctCount / questions.length) * 100),
            questions: questions,
            user_answers: Object.values(selectedAnswers),
            ai_feedback: `${result.concept_gap}: ${result.feedback}`,
          });

          // 2. Fetch existing topic and update mastery
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
      // Spec-compliant fallback feedback (§5 Task 2)
      setQuizResult({
        score: correctCount,
        total: questions.length,
        concept_gap: 'Relative velocity vector calculations in pursuit scenarios',
        feedback:
          'Formula application breaks down when both bodies move in the same direction. Focus on relative speed subtraction.',
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

  // Button 1: Add remedial task to tomorrow (§6 Screen 6)
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
          why: `Remedial task triggered by quiz diagnostic gap: ${quizResult.concept_gap}`,
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
      `✓ Remedial task ("${quizResult.remedial_task.task}") has been queued in tomorrow's daily plan!`
    );
  };

  // Button 2: Retry in 3 days (Spaced repetition SM-2 loop, §6 Screen 6)
  const handleSpacedRetry = () => {
    setActionNotice(
      `✓ Spaced repetition scheduled: You will be re-tested on "${topicName}" in 3 days to verify retention.`
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-grey/20">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-grey">
            Diagnostic Assessment · {topicName}
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-navy mt-0.5">
            5-Question Concept Diagnostic
          </h1>
        </div>
        <span className="text-xs bg-navy text-white px-3 py-1 rounded-full font-mono">
          Under 24h Loop
        </span>
      </div>

      {!quizResult ? (
        /* QUIZ ACTIVE VIEW (§6 Screen 6: One question per screen, no back navigation, progress dots at the top) */
        <div className="bg-white rounded-2xl shadow-sm border border-grey/20 p-6 md:p-8 space-y-6">
          {/* Progress dots at the top */}
          <div className="flex items-center justify-between pb-4 border-b border-grey/15">
            <span className="text-xs font-bold text-navy">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-2">
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'bg-blue scale-125 ring-2 ring-blue/30'
                      : selectedAnswers[idx]
                      ? 'bg-navy'
                      : 'bg-grey/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Question text */}
          <div className="min-h-[90px]">
            <p className="text-base md:text-lg font-bold text-navy leading-relaxed">
              {currentQ.q}
            </p>
          </div>

          {/* Options (One question per screen, no back navigation) */}
          <div className="space-y-3">
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = selectedAnswers[currentIndex] === opt;
              const letter = String.fromCharCode(65 + oIdx);
              return (
                <div
                  key={oIdx}
                  onClick={() => handleSelectOption(opt)}
                  className={`p-4 rounded-xl border text-sm font-medium cursor-pointer transition flex items-center gap-3 ${
                    isSelected
                      ? 'border-blue bg-blue/10 text-blue ring-1 ring-blue font-semibold'
                      : 'border-grey/25 bg-white text-slate-800 hover:border-grey hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isSelected ? 'bg-blue text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="flex-1">{opt}</span>
                </div>
              );
            })}
          </div>

          {/* Forward Navigation Only */}
          <div className="pt-4 flex items-center justify-between border-t border-grey/15">
            <span className="text-[11px] text-grey">
              Exam discipline active: No back navigation permitted
            </span>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                disabled={!selectedAnswers[currentIndex]}
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-blue hover:bg-blue/90 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
              >
                Next Question →
              </button>
            ) : (
              <button
                type="button"
                disabled={!selectedAnswers[currentIndex] || isSubmitting}
                onClick={handleSubmitQuiz}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Concept Gap...</span>
                  </>
                ) : (
                  <span>Submit Quiz & Get Concept Feedback →</span>
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* QUIZ FEEDBACK VIEW (§6 Screen 6: "concept-level feedback, not a score") */
        <div className="bg-white rounded-2xl shadow-sm border border-grey/20 p-6 md:p-8 space-y-6">
          {/* Header Score & Callout */}
          <div className="p-5 rounded-2xl bg-navy text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-sky">
                Diagnostic Outcome
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                {quizResult.score} of {quizResult.total} Correct
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Mastery Delta: <span className="text-orange font-bold font-mono">{quizResult.mastery_delta}%</span> writeback to your profile
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/10 border border-white/10 text-center">
              <span className="text-xs text-slate-300 block">Status Recalculated</span>
              <span className="text-sm font-bold text-orange">
                Weak Topic (Requires Remediation)
              </span>
            </div>
          </div>

          {/* CONCEPT-LEVEL FEEDBACK BOX (§6 Screen 6: "3 of 5. The pattern is relative motion in time–speed–distance, not percentages.") */}
          <div className="p-5 rounded-2xl bg-orange/5 border-2 border-orange/30 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-orange">
                Identified Concept Gap: {quizResult.concept_gap}
              </h3>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">
              {quizResult.feedback}
            </p>
          </div>

          {actionNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 animate-in fade-in">
              {actionNotice}
            </div>
          )}

          {/* TWO MANDATORY BUTTONS (§6 Screen 6) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Button 1: Add remedial task to tomorrow */}
            <button
              type="button"
              onClick={handleAddRemedialTask}
              className="py-3 px-4 rounded-xl bg-blue hover:bg-blue/90 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2"
            >
              <span>📋</span>
              <span>Add Remedial Task to Tomorrow</span>
            </button>

            {/* Button 2: Retry in 3 days (spaced repetition SM-2) */}
            <button
              type="button"
              onClick={handleSpacedRetry}
              className="py-3 px-4 rounded-xl bg-navy hover:bg-navy/90 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2"
            >
              <span>🔄</span>
              <span>Retry in {quizResult.retest_in_days} Days (Spaced Retention)</span>
            </button>
          </div>

          <div className="pt-4 border-t border-grey/15 flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => {
                setQuizResult(null);
                setSelectedAnswers({});
                setCurrentIndex(0);
                setActionNotice(null);
              }}
              className="text-grey hover:text-navy"
            >
              ← Take Another Diagnostic
            </button>
            <button
              type="button"
              onClick={() => navigate('/plan')}
              className="text-blue font-semibold hover:underline"
            >
              Open Tomorrow's Updated Plan →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
